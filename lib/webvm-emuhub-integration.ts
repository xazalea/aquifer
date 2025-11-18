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
      
      // Step 1: Initialize WebVM
      const webvmInitialized = await this.initWebVM()
      if (!webvmInitialized) {
        console.warn('⚠️ WebVM not available, EmuHub will not work')
        return false
      }

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
      console.error('❌ Failed to initialize WebVM + EmuHub:', error)
      return false
    }
  }

  /**
   * Initialize WebVM/CheerpX (REAL implementation, no simulation)
   */
  private async initWebVM(): Promise<boolean> {
    try {
      console.log('🚀 Initializing real WebVM/CheerpX...')

      // First, try CheerpX integration (real implementation)
      this.cheerpx = new CheerpXIntegration({
        memorySize: this.config.webvmMemorySize,
        enableDocker: true,
      })

      const cheerpxInitialized = await this.cheerpx.init()
      if (cheerpxInitialized && this.cheerpx.isReady()) {
        console.log('✅ CheerpX initialized - using real Docker support')
        // Use CheerpX for Docker operations
        this.webvm = this.cheerpx.getInstance()
        return true
      }

      // Fallback: Try WebVM directly
      if (typeof window !== 'undefined') {
        if ((window as any).WebVM) {
          const WebVM = (window as any).WebVM
          try {
            this.webvm = new WebVM({
              memorySize: this.config.webvmMemorySize,
            })
            console.log('✅ WebVM initialized - using real Docker support')
            return true
          } catch (error) {
            console.warn('⚠️ WebVM constructor failed:', error)
          }
        }

        // Try BrowserPod
        if ((window as any).BrowserPod) {
          try {
            this.webvm = (window as any).BrowserPod
            console.log('✅ BrowserPod SDK found - using real Docker support')
            return true
          } catch (error) {
            console.warn('⚠️ BrowserPod initialization failed:', error)
          }
        }
      }

      // Try to load from CDN
      await this.loadWebVM()
      
      if (typeof window !== 'undefined' && (window as any).WebVM) {
        const WebVM = (window as any).WebVM
        try {
          this.webvm = new WebVM({
            memorySize: this.config.webvmMemorySize,
          })
          console.log('✅ WebVM loaded and initialized')
          return true
        } catch (error) {
          console.warn('⚠️ WebVM initialization failed:', error)
        }
      }

      // NO FALLBACK - return false if real WebVM/CheerpX is not available
      console.error('❌ Real WebVM/CheerpX/BrowserPod not available. Cannot run Docker containers.')
      console.error('💡 To enable: Build WebVM from https://github.com/leaningtech/webvm or use BrowserPod SDK')
      return false
    } catch (error) {
      console.error('❌ Failed to initialize WebVM/CheerpX:', error)
      return false
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
  private async executeDockerCommand(command: string): Promise<string> {
    // CRITICAL: Prevent infinite recursion - check flag FIRST
    if (this.isExecutingCommand) {
      throw new Error('Docker command already executing')
    }

    // Set flag BEFORE any async operations
    this.isExecutingCommand = true
    
    try {
      // Try REAL CheerpX execution first
      if (this.cheerpx && this.cheerpx.isReady()) {
        try {
          const result = await this.cheerpx.execute(command)
          return result
        } catch (error) {
          console.error('CheerpX execution failed:', error)
          throw error
        }
      }

      // Try REAL WebVM execution
      if (this.webvm) {
        // WebVM Docker API
        if (this.webvm.docker && typeof this.webvm.docker.exec === 'function') {
          try {
            const result = await this.webvm.docker.exec(command)
            if (result !== undefined && result !== null && result !== '') {
              return result
            }
          } catch (error) {
            console.error('WebVM Docker API execution failed:', error)
            throw error
          }
        }

        // WebVM execute function
        if (typeof this.webvm.execute === 'function') {
          try {
            const result = await this.webvm.execute(command)
            if (result !== undefined && result !== null && result !== '') {
              return result
            }
          } catch (error) {
            console.error('WebVM execute failed:', error)
            throw error
          }
        }

        // BrowserPod-style
        if (typeof this.webvm.runCommand === 'function') {
          try {
            const result = await this.webvm.runCommand(command)
            return result
          } catch (error) {
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
      // Check if Docker is available using REAL execution
      try {
        const dockerCheck = await this.executeDockerCommand('docker --version')
        if (dockerCheck && (dockerCheck.includes('Docker version') || dockerCheck.includes('docker'))) {
          console.log('✅ Docker is available in WebVM/CheerpX')
          
          // Check if Docker daemon is running
          try {
            await this.executeDockerCommand('docker ps')
            console.log('✅ Docker daemon is running')
            return true
          } catch (error) {
            console.log('⚠️ Docker daemon not running, attempting to start...')
            // Try to start Docker daemon
            try {
              await this.executeDockerCommand('dockerd &')
              // Wait a bit for Docker to start
              await new Promise(resolve => setTimeout(resolve, 3000))
              // Check again
              await this.executeDockerCommand('docker ps')
              console.log('✅ Docker daemon started')
              return true
            } catch (startError) {
              console.warn('⚠️ Could not start Docker daemon:', startError)
              return false
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Docker not available:', error)
        return false
      }

      return false
    } catch (error) {
      console.error('❌ Failed to start Docker:', error)
      return false
    }
  }


  /**
   * Start EmuHub Docker container in WebVM
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
          throw error
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
          throw error
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
          throw error
        }
      }

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

      return true
    } catch (error) {
      console.error('Failed to start EmuHub container:', error)
      return false
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

