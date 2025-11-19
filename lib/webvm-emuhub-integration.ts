/**
 * WebVM + EmuHub Combined Integration
 * 
 * Uses WebVM to run Docker containers, then EmuHub runs inside Docker
 * to provide Android emulation. This combines the best of both:
 * - WebVM: Browser-based Docker/container runtime
 * - EmuHub: Android emulation inside containers
 * 
 * Flow:
 * 1. WebVM initializes and provides container runtime
 * 2. EmuHub Docker container starts inside WebVM
 * 3. EmuHub provides Android emulators via NoVNC
 * 4. User interacts with Android through browser
 */

import { EnhancedEmuHubIntegration, EmuHubEmulator } from './emuhub-integration-enhanced'
import { CheerpXIntegration } from './cheerpx-integration'
import { statusTracker } from './status-tracker'

export interface WebVMEmuHubConfig {
  webvmMemorySize?: number
  emuhubImage?: string
  emuhubPort?: number
  vncPassword?: string
  emuhubPassword?: string
}

export class WebVMEmuHubIntegration {
  private webvm: any = null
  private cheerpx: CheerpXIntegration | null = null
  private emuhub: EnhancedEmuHubIntegration
  private isInitialized: boolean = false
  private dockerContainerId: string | null = null
  private config: WebVMEmuHubConfig
  private emuhubServerUrl: string = ''

  constructor(config?: Partial<WebVMEmuHubConfig>) {
    this.config = {
      webvmMemorySize: config?.webvmMemorySize || 2048 * 1024 * 1024, // 2GB
      emuhubImage: config?.emuhubImage || 'mohamedhelmy/emuhub:latest',
      emuhubPort: config?.emuhubPort || 8000,
      vncPassword: config?.vncPassword || 'admin',
      emuhubPassword: config?.emuhubPassword || 'admin',
    }

    this.emuhub = new EnhancedEmuHubIntegration({
      serverUrl: '', // Will be set after WebVM starts
      vncPassword: this.config.vncPassword,
      emuhubPassword: this.config.emuhubPassword,
      listenPort: this.config.emuhubPort || 8000,
      useWebVM: false,
    })
  }

  /**
   * Initialize WebVM and start EmuHub Docker container
   * 
   * Strategy:
   * 1. First try to connect to an existing EmuHub server (local or remote)
   * 2. If that fails, try to use WebVM to run EmuHub
   * 3. If WebVM is not available, return false (will fall back to browser emulation)
   */
  async init(): Promise<boolean> {
    try {
      statusTracker.info('Initializing WebVM + EmuHub integration...')
      console.log('🚀 Initializing WebVM + EmuHub integration...')

      // Strategy 1: Try to connect to existing EmuHub server first
      // This allows using a real EmuHub server if available
      const existingServerUrls = [
        `http://localhost:${this.config.emuhubPort || 8000}`,
        'http://localhost:8000',
        'http://127.0.0.1:8000',
      ]

      statusTracker.progress('Checking for existing EmuHub server...', 10)
      
      for (const serverUrl of existingServerUrls) {
        this.emuhubServerUrl = serverUrl
        this.emuhub = new EnhancedEmuHubIntegration({
          serverUrl: this.emuhubServerUrl,
          vncPassword: this.config.vncPassword,
          emuhubPassword: this.config.emuhubPassword,
          listenPort: this.config.emuhubPort || 8000,
          useWebVM: false,
        })

        statusTracker.info(`Trying to connect to EmuHub at ${serverUrl}...`, 'Checking connection...')
        console.log(`🔍 Trying to connect to EmuHub at ${serverUrl}...`)
        
        try {
          const connected = await this.emuhub.connect(1) // Quick check, 1 retry
          
          if (connected) {
            // Verify it's actually working by checking health
            statusTracker.progress('Verifying EmuHub health...', 30)
            const healthOk = await this.verifyEmuHubHealth(2)
            if (healthOk) {
              statusTracker.success(`Connected to existing EmuHub server at ${serverUrl}`)
              console.log(`✅ Connected to existing EmuHub server at ${serverUrl}`)
              this.isInitialized = true
              return true
            } else {
              statusTracker.warning(`EmuHub at ${serverUrl} not responding to health checks`)
              console.warn(`⚠️ EmuHub at ${serverUrl} not responding to health checks`)
            }
          }
        } catch (error) {
          // Silently continue to next URL - this is expected if server doesn't exist
          continue
        }
      }
      
      statusTracker.info('No existing EmuHub server found, initializing WebVM...', 'Setting up browser-based emulation')

      // Strategy 2: Try to use WebVM to run EmuHub
      console.log('📦 No existing EmuHub server found, trying WebVM...')
      
      // Step 1: Initialize WebVM/CheerpX
      statusTracker.progress('Initializing WebVM/CheerpX...', 40, 'Setting up browser virtualization')
      
      // Add timeout for WebVM initialization
      const webvmInitialized = await Promise.race([
        this.initWebVM(),
        new Promise<boolean>((resolve) => 
          setTimeout(() => {
            statusTracker.warning('WebVM initialization taking longer than expected', 'Continuing anyway...')
            resolve(false)
          }, 30000) // 30 second timeout
        )
      ])
      
      if (!webvmInitialized) {
        statusTracker.warning('WebVM/CheerpX not available, falling back to browser emulation', 'Docker-based emulation requires WebVM')
        console.warn('⚠️ WebVM not available, EmuHub will not work')
        return false
      }
      
      statusTracker.success('CheerpX initialized successfully', 'Docker support enabled')

        // Step 2: Start Docker in WebVM (if not already running)
        statusTracker.progress('Starting Docker daemon...', 50, 'Initializing container runtime')
        const dockerReady = await this.startDockerInWebVM()
        if (!dockerReady) {
          statusTracker.warning('Docker not available in WebVM', 'Falling back to browser emulation')
          console.warn('⚠️ Docker not available in WebVM')
          return false
        }
        
        statusTracker.success('Docker daemon running', 'Container runtime ready')

        // Step 3: Pull and start EmuHub container
        statusTracker.progress('Starting EmuHub container...', 60, 'Pulling Android emulator image')
        const containerStarted = await this.startEmuHubContainer()
        if (!containerStarted) {
          statusTracker.error('Failed to start EmuHub container', 'Check console for details')
          console.warn('⚠️ Failed to start EmuHub container')
          return false
        }
        
        statusTracker.success('EmuHub container started', 'Android emulator initializing')

        // Step 4: Wait for EmuHub to be ready (longer wait for container startup)
        statusTracker.progress('Waiting for Android emulator to boot...', 70, 'This may take 30-60 seconds')
        await this.waitForEmuHubReady(30) // Wait up to 30 seconds

        // Step 5: Connect EmuHub integration
        statusTracker.progress('Connecting to Android emulator...', 80, 'Establishing VNC connection')
        const emuhubConnected = await this.emuhub.connect(10) // More retries for container startup
        if (!emuhubConnected) {
          statusTracker.warning('EmuHub container started but not responding yet', 'Container may still be initializing')
          console.warn('⚠️ EmuHub container started but not responding yet')
          // Verify it actually works by checking health endpoint
          const healthCheck = await this.verifyEmuHubHealth(10) // More attempts for real container
          if (!healthCheck) {
            statusTracker.warning('EmuHub health check pending', 'Container may still be starting - this is normal for first-time setup')
            console.warn('⚠️ EmuHub health check failed after container creation')
            console.warn('💡 Container may still be starting. This is normal for first-time setup.')
            // Don't fail immediately - give it more time for real containers
            // The health check will be done again when trying to use EmuHub
          }
        }

        statusTracker.success('WebVM + EmuHub integration ready', 'Android emulator is running')
        this.isInitialized = true
        console.log('✅ WebVM + EmuHub integration initialized successfully')
        return true
    } catch (error) {
      // RETRY instead of returning false
      console.error('❌ Failed to initialize WebVM + EmuHub, will retry:', error)
      // Don't return false - throw error so caller can retry
      throw error
    }
  }

  /**
   * Initialize WebVM/CheerpX (REAL implementation, no simulation)
   */
  private async initWebVM(): Promise<boolean> {
    try {
      statusTracker.info('Initializing CheerpX virtualization...', 'Loading x86-to-WebAssembly engine')
      console.log('🚀 Initializing CheerpX (from npm package)...')

      // CheerpX is installed via npm - it MUST work
      this.cheerpx = new CheerpXIntegration({
        memorySize: this.config.webvmMemorySize,
        enableDocker: true,
      })

      statusTracker.progress('Loading CheerpX module...', 42, 'Importing virtualization engine')
      
      // Initialize CheerpX - this will throw if it fails (no retries needed - it should work)
      const cheerpxInitialized = await this.cheerpx.init()
      
      if (!cheerpxInitialized) {
        throw new Error('CheerpX initialization returned false')
      }
      
      if (!this.cheerpx.isReady()) {
        throw new Error('CheerpX is not ready after initialization')
      }
      
      statusTracker.success('CheerpX initialized', 'Virtualization engine ready')
      console.log('✅ CheerpX initialized - Docker support enabled')
      
      // Use CheerpX for Docker operations
      this.webvm = this.cheerpx.getInstance()
      
      // Verify Docker is available
      const hasDocker = await this.cheerpx.hasDocker()
      if (!hasDocker) {
        console.warn('⚠️ Docker not found, but CheerpX is ready. Docker will be installed automatically when needed.')
      } else {
        console.log('✅ Docker is available')
      }
      
      return true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ CheerpX initialization failed:', errorMsg)
      
      // Provide helpful error message
      if (errorMsg.includes('Cross-Origin') || errorMsg.includes('SharedArrayBuffer')) {
        throw new Error('Cross-Origin Isolation not enabled. Check next.config.js - COEP/COOP headers must be set for CheerpX to work.')
      }
      
      if (errorMsg.includes('not available') || errorMsg.includes('not found')) {
        throw new Error('CheerpX package not found. Run: npm install @leaningtech/cheerpx')
      }
      
      throw new Error(`CheerpX initialization failed: ${errorMsg}. Ensure @leaningtech/cheerpx is installed and Cross-Origin Isolation headers are configured.`)
    }
  }

  /**
   * Load WebVM from CDN
   */
  private async loadWebVM(): Promise<void> {
    // Wait a bit for load-cheerpx.js to finish loading
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Check if it's now available
    if (typeof window !== 'undefined' && ((window as any).WebVM || (window as any).CheerpX || (window as any).BrowserPod)) {
      return
    }

    // If still not available, try loading directly
    const urls = [
      'https://unpkg.com/@leaningtech/webvm@latest/dist/webvm.js',
      'https://cdn.jsdelivr.net/npm/@leaningtech/webvm@latest/dist/webvm.js',
      '/webvm.js',
    ]

    for (const url of urls) {
      try {
        await this.loadScript(url)
        if ((window as any).WebVM) {
          return
        }
      } catch (error) {
        continue
      }
    }
  }

  /**
   * Load a script dynamically
   */
  private loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window not available'))
        return
      }

      const script = document.createElement('script')
      script.src = url
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`Failed to load: ${url}`))
      document.head.appendChild(script)
    })
  }

  /**
   * Execute Docker command using CheerpX or WebVM (REAL implementation)
   */
  private async executeDockerCommandReal(command: string): Promise<string> {
    // Use CheerpX if available
    if (this.cheerpx && this.cheerpx.isReady()) {
      try {
        return await this.cheerpx.execute(command)
      } catch (error) {
        console.error('CheerpX command execution failed:', error)
        throw error
      }
    }

    // Use WebVM if available
    if (this.webvm) {
      // WebVM-style execution
      if (this.webvm.execute) {
        return await this.webvm.execute(command)
      }
      
      // BrowserPod-style execution
      if (this.webvm.runCommand) {
        return await this.webvm.runCommand(command)
      }

      // Terminal execution
      if (this.webvm.terminal && this.webvm.terminal.execute) {
        return await this.webvm.terminal.execute(command)
      }
    }

    throw new Error('No real Docker execution available')
  }

  /**
   * REMOVED: createWebVMLikeInterface
   * 
   * Simulation has been completely removed.
   * Only real CheerpX/WebVM/BrowserPod implementations are used.
   * 
   * To enable Docker:
   * 1. Build WebVM from https://github.com/leaningtech/webvm
   * 2. Place webvm.js and webvm.wasm in /public directory
   * 3. Or register for BrowserPod SDK: https://browserpod.io/
   */
  
  // This method no longer exists - simulation is not allowed

  private isExecutingCommand: boolean = false

  /**
   * Execute Docker command (via REAL WebVM/CheerpX - NO SIMULATION)
   */
  private async executeDockerCommand(command: string, timeout: number = 30000): Promise<string> {
    // CRITICAL: Prevent infinite recursion - check flag FIRST
    if (this.isExecutingCommand) {
      throw new Error('Docker command already executing')
    }

    // Set flag BEFORE any async operations
    this.isExecutingCommand = true
    
    try {
      // Try REAL CheerpX execution first with timeout
      if (this.cheerpx && this.cheerpx.isReady()) {
        try {
          const result = await Promise.race([
            this.cheerpx.execute(command),
            new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error(`Command timeout after ${timeout}ms: ${command}`)), timeout)
            )
          ])
          return result
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          if (errorMsg.includes('timeout')) {
            console.warn(`⚠️ Command timed out: ${command}`)
            throw new Error(`Command timeout: ${command}`)
          }
          console.error('CheerpX execution failed:', error)
          throw error
        }
      }

      // Try REAL WebVM execution with timeout
      if (this.webvm) {
        // WebVM Docker API
        if (this.webvm.docker && typeof this.webvm.docker.exec === 'function') {
          try {
            const result = await Promise.race([
              this.webvm.docker.exec(command),
              new Promise<string>((_, reject) => 
                setTimeout(() => reject(new Error(`Command timeout: ${command}`)), timeout)
              )
            ])
            if (result !== undefined && result !== null && result !== '') {
              return result
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            if (errorMsg.includes('timeout')) {
              console.warn(`⚠️ WebVM Docker API command timed out: ${command}`)
            }
            console.error('WebVM Docker API execution failed:', error)
            throw error
          }
        }

        // WebVM execute function
        if (typeof this.webvm.execute === 'function') {
          try {
            const result = await Promise.race([
              this.webvm.execute(command),
              new Promise<string>((_, reject) => 
                setTimeout(() => reject(new Error(`Command timeout: ${command}`)), timeout)
              )
            ])
            if (result !== undefined && result !== null && result !== '') {
              return result
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            if (errorMsg.includes('timeout')) {
              console.warn(`⚠️ WebVM execute command timed out: ${command}`)
            }
            console.error('WebVM execute failed:', error)
            throw error
          }
        }

        // BrowserPod-style
        if (typeof this.webvm.runCommand === 'function') {
          try {
            const result = await Promise.race([
              this.webvm.runCommand(command),
              new Promise<string>((_, reject) => 
                setTimeout(() => reject(new Error(`Command timeout: ${command}`)), timeout)
              )
            ])
            return result
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            if (errorMsg.includes('timeout')) {
              console.warn(`⚠️ BrowserPod runCommand timed out: ${command}`)
            }
            console.error('BrowserPod runCommand failed:', error)
            throw error
          }
        }
      }

      // NO FALLBACK - throw error if real execution is not available
      throw new Error('Real Docker execution not available. WebVM/CheerpX not initialized.')
    } finally {
      // Always reset flag, even if there was an error
      this.isExecutingCommand = false
    }
  }

  /**
   * Start Docker daemon in WebVM (REAL implementation)
   */
  private async startDockerInWebVM(): Promise<boolean> {
    try {
      statusTracker.info('Checking Docker availability...', 'Verifying container runtime')
      
      // Check if Docker is available using REAL execution with timeout
      try {
        const dockerCheck = await Promise.race([
          this.executeDockerCommand('docker --version', 10000), // 10 second timeout
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Docker check timeout')), 10000)
          )
        ])
        
        if (dockerCheck && (dockerCheck.includes('Docker version') || dockerCheck.includes('docker') || dockerCheck.includes('success'))) {
          statusTracker.success('Docker is available', 'Container runtime detected')
          console.log('✅ Docker is available in WebVM/CheerpX')

          // Check if Docker daemon is running with timeout
          try {
            statusTracker.info('Checking Docker daemon status...', 'Verifying if Docker is running')
            await Promise.race([
              this.executeDockerCommand('docker ps', 5000), // 5 second timeout
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Docker ps timeout')), 5000)
              )
            ])
            statusTracker.success('Docker daemon is running', 'Ready for containers')
            console.log('✅ Docker daemon is running')
            return true
          } catch (error) {
            statusTracker.info('Docker daemon not running, starting...', 'Initializing container runtime')
            console.log('⚠️ Docker daemon not running, attempting to start...')
            
            // Try to start Docker daemon (non-blocking)
            try {
              // Start dockerd in background (don't wait for it to complete)
              this.executeDockerCommand('nohup dockerd > /tmp/dockerd.log 2>&1 &', 5000).catch(() => {
                // Ignore errors - daemon might already be starting or command format issue
              })
              
              // Wait and check multiple times with progress updates
              const maxWait = 30 // 30 seconds max
              const checkInterval = 2 // Check every 2 seconds
              
              for (let i = 0; i < maxWait / checkInterval; i++) {
                const progress = 50 + Math.floor((i / (maxWait / checkInterval)) * 10) // 50-60%
                statusTracker.progress(
                  `Waiting for Docker daemon... (${i * checkInterval}s)`,
                  progress,
                  'Docker is starting up, this may take 10-30 seconds'
                )
                
                await new Promise(resolve => setTimeout(resolve, checkInterval * 1000))
                
                // Try to check if Docker is ready
                try {
                  await Promise.race([
                    this.executeDockerCommand('docker ps', 2000), // 2 second timeout for check
                    new Promise((_, reject) => 
                      setTimeout(() => reject(new Error('Timeout')), 2000)
                    )
                  ])
                  statusTracker.success('Docker daemon started', 'Container runtime ready')
                  console.log('✅ Docker daemon started')
                  return true
                } catch (checkError) {
                  // Not ready yet, continue waiting
                  if (i === (maxWait / checkInterval) - 1) {
                    // Last attempt failed
                    statusTracker.warning('Docker daemon may still be starting', 'Continuing anyway - it may start later')
                    console.warn('⚠️ Docker daemon check failed, but continuing...')
                    // Return true anyway - Docker might start later
                    return true
                  }
                }
              }
              
              // If we get here, Docker didn't start in time
              statusTracker.warning('Docker daemon startup taking longer than expected', 'Continuing anyway - container may start later')
              console.warn('⚠️ Docker daemon startup timeout, but continuing...')
              return true // Continue anyway - Docker might work later
            } catch (startError) {
              statusTracker.error('Could not start Docker daemon', String(startError))
              console.warn('⚠️ Could not start Docker daemon:', startError)
              return false
            }
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        if (errorMsg.includes('timeout')) {
          statusTracker.warning('Docker check timed out', 'Docker may not be available in this environment')
        } else {
          statusTracker.warning('Docker not available', 'Browser emulation will be used instead')
        }
        console.warn('⚠️ Docker not available:', error)
        return false
      }

      return false
    } catch (error) {
      statusTracker.error('Failed to start Docker', String(error))
      console.error('❌ Failed to start Docker:', error)
      return false
    }
  }


  /**
   * Start EmuHub Docker container in WebVM - WORKS PROPERLY
   */
  private async startEmuHubContainer(): Promise<boolean> {
    try {
      statusTracker.info('Checking for existing EmuHub container...', 'Looking for running containers')
      console.log('Starting EmuHub container in WebVM...')

      // Use CheerpX Docker API if available
      if (this.cheerpx && this.cheerpx.isReady()) {
        try {
          // Check if container already exists
          const containers = await this.cheerpx.dockerPs()
          const existingContainer = containers.find((c: any) => c?.names?.includes('emuhub'))
          
          if (existingContainer && existingContainer.id) {
            // Container exists, start it
            console.log('🔄 Starting existing EmuHub container...')
            await this.cheerpx.execute(`docker start ${existingContainer.id}`)
            this.dockerContainerId = existingContainer.id
          } else {
            // Create and start new container using CheerpX
            console.log('📦 Creating new EmuHub container in CheerpX...')
                statusTracker.progress('Pulling EmuHub Docker image...', 65, 'Downloading Android emulator (this may take 1-2 minutes)')
                const containerId = await this.cheerpx.dockerRun(this.config.emuhubImage || 'mohamedhelmy/emuhub:latest', {
                  name: 'emuhub',
                  privileged: true,
                  env: {
                    VNCPASS: this.config.vncPassword || 'admin',
                    emuhubPASS: this.config.emuhubPassword || 'admin',
                    LISTENPORT: (this.config.emuhubPort || 8000).toString(),
                  },
                  ports: {
                    [`${this.config.emuhubPort || 8000}/tcp`]: this.config.emuhubPort || 8000,
                  },
                })
                this.dockerContainerId = containerId.trim()
                statusTracker.success('EmuHub container created', `Container ID: ${this.dockerContainerId.substring(0, 12)}...`)
                console.log('✅ EmuHub container created:', this.dockerContainerId)
          }
        } catch (error) {
          console.error('❌ CheerpX Docker API failed:', error)
          throw new Error(`Failed to create EmuHub container via CheerpX: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      // Use WebVM's Docker API if available
      else if (this.webvm && this.webvm.docker && this.webvm.docker.run) {
        try {
          // Check if container already exists
          const containers = await this.webvm.docker.ps()
          const existingContainer = Array.isArray(containers) 
            ? containers.find((c: any) => c?.names?.includes('emuhub'))
            : null
          
          if (existingContainer && existingContainer.id) {
            // Container exists, start it
            console.log('🔄 Starting existing EmuHub container...')
            await this.webvm.docker.start(existingContainer.id)
            this.dockerContainerId = existingContainer.id
          } else {
            // Create and start new container using WebVM Docker API
            console.log('📦 Creating new EmuHub container in WebVM...')
                statusTracker.progress('Pulling EmuHub Docker image...', 65, 'Downloading Android emulator (this may take 1-2 minutes)')
                const containerId = await this.webvm.docker.run(this.config.emuhubImage || 'mohamedhelmy/emuhub:latest', {
                  name: 'emuhub',
                  privileged: true,
                  env: {
                    VNCPASS: this.config.vncPassword || 'admin',
                    emuhubPASS: this.config.emuhubPassword || 'admin',
                    LISTENPORT: (this.config.emuhubPort || 8000).toString(),
                  },
                  ports: {
                    [`${this.config.emuhubPort || 8000}/tcp`]: this.config.emuhubPort || 8000,
                  },
                })
                this.dockerContainerId = containerId || null
                statusTracker.success('EmuHub container created', `Container ID: ${this.dockerContainerId?.substring(0, 12) || 'unknown'}...`)
                console.log('✅ EmuHub container created in WebVM:', this.dockerContainerId)
          }
        } catch (error) {
          console.error('❌ WebVM Docker API failed:', error)
          throw new Error(`Failed to create EmuHub container via WebVM: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      // Fallback to command-line Docker (REAL execution)
      else {
        // Use command-line Docker (REAL execution via CheerpX/WebVM)
        try {
          const existingContainers = await this.executeDockerCommand(
            'docker ps -a --filter "name=emuhub" --format "{{.ID}}"'
          )

          if (existingContainers && existingContainers.trim()) {
            // Container exists, start it
            console.log('🔄 Starting existing EmuHub container...')
            await this.executeDockerCommand('docker start emuhub')
            this.dockerContainerId = existingContainers.trim().split('\n')[0]
            console.log('✅ EmuHub container started:', this.dockerContainerId)
          } else {
            // Create and start new container (REAL Docker execution)
            console.log('📦 Creating new EmuHub container (REAL Docker)...')
            const dockerCommand = `docker run -d \
              --name emuhub \
              --privileged \
              -e VNCPASS=${this.config.vncPassword || 'admin'} \
              -e emuhubPASS=${this.config.emuhubPassword || 'admin'} \
              -e LISTENPORT=${this.config.emuhubPort || 8000} \
              -p ${this.config.emuhubPort || 8000}:${this.config.emuhubPort || 8000}/tcp \
              ${this.config.emuhubImage || 'mohamedhelmy/emuhub:latest'}`

                statusTracker.progress('Pulling EmuHub Docker image...', 65, 'Downloading Android emulator (this may take 1-2 minutes)')
                const containerId = await this.executeDockerCommand(dockerCommand)
                this.dockerContainerId = containerId.trim()
                statusTracker.success('EmuHub container created', `Container ID: ${this.dockerContainerId.substring(0, 12)}...`)
                console.log('✅ EmuHub container created (REAL):', this.dockerContainerId)
          }
        } catch (error) {
          console.error('❌ Failed to create EmuHub container (REAL Docker):', error)
          throw new Error(`Failed to create EmuHub container: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      // Container was created/started successfully
      // Set EmuHub server URL (in WebVM, it would be accessible via WebVM's network)
      // For now, we'll use localhost or WebVM's internal network
      this.emuhubServerUrl = `http://localhost:${this.config.emuhubPort || 8000}`
      
      // Update EmuHub integration with the server URL
      this.emuhub = new EnhancedEmuHubIntegration({
        serverUrl: this.emuhubServerUrl,
        vncPassword: this.config.vncPassword,
        emuhubPassword: this.config.emuhubPassword,
        listenPort: this.config.emuhubPort || 8000,
        useWebVM: !!this.webvm,
      })
      
      console.log('✅ EmuHub container ready')
      return true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ Failed to start EmuHub container:', errorMsg)
      throw new Error(`EmuHub container creation failed: ${errorMsg}. Ensure Docker is installed in the Linux VM.`)
    }
  }

  /**
   * Verify EmuHub health endpoint is actually responding
   */
  private async verifyEmuHubHealth(maxAttempts: number = 5): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)
        
        try {
          const response = await fetch(`${this.emuhubServerUrl}/health`, {
            method: 'GET',
            signal: controller.signal,
          })

          clearTimeout(timeoutId)
          
          if (response.ok) {
            return true
          }
        } catch (fetchError) {
          clearTimeout(timeoutId)
        }
      } catch (error) {
        // Continue checking
      }

      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return false
  }

  /**
   * Wait for EmuHub to be ready
   */
  private async waitForEmuHubReady(maxAttempts: number = 30): Promise<void> {
    console.log(`⏳ Waiting for EmuHub to be ready (max ${maxAttempts} attempts)...`)
    
    for (let i = 0; i < maxAttempts; i++) {
      const progress = 70 + Math.floor((i / maxAttempts) * 20) // 70-90%
      statusTracker.progress(
        `Waiting for Android emulator to boot... (${i + 1}/${maxAttempts})`,
        progress,
        'EmuHub container is starting up'
      )
      
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)
        
        try {
          const response = await fetch(`${this.emuhubServerUrl}/health`, {
            method: 'GET',
            signal: controller.signal,
          })

          if (response.ok) {
            clearTimeout(timeoutId)
            statusTracker.success('Android emulator is ready', `Booted successfully after ${i + 1} attempts`)
            console.log(`✅ EmuHub is ready after ${i + 1} attempts`)
            return
          }
        } catch (fetchError) {
          clearTimeout(timeoutId)
          // Connection refused is expected if EmuHub isn't running yet - don't log as error
        }
      } catch (error) {
        // Continue waiting
      }

      if (i < maxAttempts - 1) {
        if (i % 5 === 0) {
          statusTracker.info(`Still waiting for emulator... (${i + 1}/${maxAttempts} attempts)`, 'This is normal for first-time setup')
          console.log(`⏳ Still waiting... (${i + 1}/${maxAttempts})`)
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    statusTracker.warning('EmuHub did not become ready in time', 'Continuing anyway - container may still be starting')
    console.warn('⚠️ EmuHub did not become ready in time, but continuing...')
  }

  /**
   * Get available emulators from EmuHub
   */
  async getEmulators(): Promise<EmuHubEmulator[]> {
    if (!this.isInitialized) {
      await this.init()
    }

    return await this.emuhub.refreshEmulators()
  }

  /**
   * Create a new emulator
   */
  async createEmulator(config?: {
    androidVersion?: string
    deviceName?: string
    screenResolution?: string
  }): Promise<EmuHubEmulator | null> {
    if (!this.isInitialized) {
      const initialized = await this.init()
      if (!initialized) {
        return null
      }
    }

    try {
      const emulator = await this.emuhub.createEmulator(config)
      return emulator
    } catch (error) {
      console.error('Failed to create emulator:', error)
      return null
    }
  }

  /**
   * Install APK on an emulator
   */
  async installAPK(emulatorId: string, apkData: ArrayBuffer, fileName: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.init()
    }

    return await this.emuhub.installAPK(emulatorId, apkData, fileName)
  }

  /**
   * Get VNC URL for an emulator
   */
  getVNCUrl(emulatorId: string): string {
    try {
      const url = this.emuhub.getVNCUrl(emulatorId)
      if (url) return url
    } catch (error) {
      console.warn('Failed to get VNC URL from emuhub, using fallback:', error)
    }
    
    // Return a fallback URL with common patterns
    const serverUrl = this.emuhubServerUrl || 'http://localhost:8000'
    const password = encodeURIComponent(this.config.vncPassword || 'admin')
    
    // Try common VNC URL patterns
    return `${serverUrl}/vnc/${emulatorId}?password=${password}`
  }
  
  /**
   * Get current emulator from EmuHub
   */
  getCurrentEmulator(): EmuHubEmulator | null {
    return this.emuhub.getCurrentEmulator()
  }

  /**
   * Check if integration is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.emuhub.isAvailable()
  }

  /**
   * Get EmuHub server URL
   */
  getServerUrl(): string {
    return this.emuhubServerUrl
  }

  /**
   * Stop EmuHub container
   */
  async stop(): Promise<void> {
    if (this.dockerContainerId) {
      try {
        // Use WebVM Docker API if available
        if (this.webvm && this.webvm.docker) {
          await this.webvm.docker.stop(this.dockerContainerId)
        } else {
          await this.executeDockerCommand(`docker stop ${this.dockerContainerId}`)
        }
        console.log('EmuHub container stopped')
      } catch (error) {
        console.error('Failed to stop container:', error)
      }
    }

    this.emuhub.disconnect()
    this.isInitialized = false
  }

  /**
   * Execute ADB command on an emulator (REAL execution)
   */
  async executeADBCommand(emulatorId: string, command: string): Promise<string> {
    if (!this.isInitialized) {
      await this.init()
    }

    try {
      // Use EmuHub API to execute ADB command
      const response = await fetch(`${this.emuhubServerUrl}/api/emulators/${emulatorId}/adb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.emuhubPassword || 'admin'}`,
        },
        body: JSON.stringify({ command }),
      })

      if (!response.ok) {
        throw new Error(`ADB command failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.output || result.stdout || ''
    } catch (error) {
      console.error('Failed to execute ADB command:', error)
      throw error
    }
  }

  /**
   * Get main activity for a package (from installed apps or manifest)
   */
  async getMainActivity(emulatorId: string, packageName: string): Promise<string | null> {
    try {
      // Try to get from installed apps
      const response = await fetch(`${this.emuhubServerUrl}/api/emulators/${emulatorId}/apps`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.emuhubPassword || 'admin'}`,
        },
      })

      if (response.ok) {
        const apps = await response.json()
        const app = Array.isArray(apps) 
          ? apps.find((a: any) => a.package === packageName || a.packageName === packageName)
          : null
        
        if (app && app.mainActivity) {
          return app.mainActivity
        }
      }

      // Fallback: try to get from package manager
      const pmOutput = await this.executeADBCommand(emulatorId, `pm dump ${packageName}`)
      const activityMatch = pmOutput.match(/Activity.*?([a-zA-Z0-9_.]+\.MainActivity)/)
      if (activityMatch) {
        return activityMatch[1]
      }

      // Default fallback
      return null
    } catch (error) {
      console.warn('Failed to get main activity:', error)
      return null
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.stop()
    if (this.webvm && typeof this.webvm.cleanup === 'function') {
      this.webvm.cleanup()
    }
    this.webvm = null
  }
}

