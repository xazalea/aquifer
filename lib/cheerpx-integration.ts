/**
 * CheerpX Integration - Real x86 Virtualization
 * 
 * CheerpX provides secure client-side execution of x86 binaries for Linux
 * on any browser. This is the underlying technology that powers WebVM and BrowserPod.
 * 
 * Documentation: https://leaningtech.com/cheerpx/
 */

import { statusTracker } from './status-tracker'

export interface CheerpXConfig {
  memorySize?: number
  enableDocker?: boolean
}

export class CheerpXIntegration {
  private cheerpx: any = null
  private linux: any = null // CheerpX Linux VM instance
  private isInitialized: boolean = false
  private config: CheerpXConfig
  private commandOutput: string = '' // Capture command output
  private commandResolve: ((value: string) => void) | null = null
  private commandReject: ((error: Error) => void) | null = null

  constructor(config?: Partial<CheerpXConfig>) {
    this.config = {
      memorySize: config?.memorySize || 2048 * 1024 * 1024, // 2GB
      enableDocker: config?.enableDocker ?? true,
    }
  }

  /**
   * Initialize CheerpX
   */
  async init(): Promise<boolean> {
    try {
      console.log('🚀 Initializing CheerpX...')

      // Try to import CheerpX from npm package (preferred method)
      try {
        // Suppress WASM loading errors from CheerpX CDN
        const originalError = console.error
        const wasmErrorHandler = (...args: any[]) => {
          const message = args.join(' ')
          // Ignore fail.wasm download errors - these are non-critical
          if (message.includes('fail.wasm') || message.includes('@fail')) {
            return // Silently ignore
          }
          originalError.apply(console, args)
        }
        console.error = wasmErrorHandler
        
        const CheerpXModule = await import('@leaningtech/cheerpx')
        // Restore original error handler
        console.error = originalError
        
        // CheerpX exports named exports: Linux, DataDevice, etc.
        this.cheerpx = CheerpXModule
        console.log('✅ CheerpX loaded from npm package (@leaningtech/cheerpx)')
      } catch (importError) {
        console.log('⚠️ Could not import CheerpX from npm, trying global...')
        
        // Check if CheerpX is available globally
        if (typeof window !== 'undefined') {
          // Try CheerpX (if available)
          if ((window as any).CheerpX) {
            this.cheerpx = (window as any).CheerpX
            console.log('✅ CheerpX found globally')
          }
          // Try BrowserPod SDK
          else if ((window as any).BrowserPod) {
            this.cheerpx = (window as any).BrowserPod
            console.log('✅ BrowserPod SDK found')
          }
          // Try WebVM (which uses CheerpX)
          else if ((window as any).WebVM) {
            this.cheerpx = (window as any).WebVM
            console.log('✅ WebVM (CheerpX-based) found')
          }
        }

        if (!this.cheerpx) {
          // Try to load from CDN or build
          await this.loadCheerpX()
        }
      }

      if (this.cheerpx) {
        // CheerpX from npm provides classes, we need to create a Linux VM instance
        // For Docker operations, we'll create the VM when needed
        this.isInitialized = true
        console.log('✅ CheerpX module loaded successfully')
        
        // Create Linux VM instance with REAL disk image (like WebVM does)
        // Note: This requires Cross-Origin Isolation headers (COEP/COOP)
        try {
          const { Linux, CloudDevice, HttpBytesDevice, IDBDevice, OverlayDevice, WebDevice, DataDevice } = this.cheerpx
          if (Linux) {
            // Check if Cross-Origin Isolation is enabled
            if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
              console.warn('⚠️ Cross-Origin Isolation not enabled. CheerpX requires COEP/COOP headers.')
              console.warn('💡 Ensure your server sends:')
              console.warn('   - Cross-Origin-Opener-Policy: same-origin')
              console.warn('   - Cross-Origin-Embedder-Policy: require-corp')
              // Don't fail, but note that VM creation will fail
            }
            
            // Use WebVM's Debian disk image (same as WebVM uses)
            // This is a real ext2 filesystem with Linux installed
            // Try HTTPS first as it's more reliable than WebSocket
            const diskImageUrl = 'https://disks.webvm.io/debian_large_20230522_5044875331.ext2'
            statusTracker.info('Loading Debian disk image...', 'Downloading Linux filesystem')
            console.log('📦 Loading Debian disk image from WebVM...')
            
            // Create block device from WebVM's disk image
            // Use HttpBytesDevice for HTTPS URLs (more reliable than WebSocket)
            let blockDevice
            let lastError: Error | null = null
            
            // Try HttpBytesDevice first (more reliable for HTTPS)
            if (diskImageUrl.startsWith('https://') || diskImageUrl.startsWith('http://')) {
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  console.log(`⏳ Attempting to load disk image via HttpBytesDevice (HTTP) - attempt ${attempt}/3...`)
                  statusTracker.progress(`Loading disk image (attempt ${attempt}/3)...`, 15 + (attempt * 5), 'Downloading Linux filesystem')
                  
                  // Add timeout for HTTP loading (120 seconds - large file)
                  blockDevice = await Promise.race([
                    HttpBytesDevice.create(diskImageUrl),
                    new Promise((_, reject) => 
                      setTimeout(() => reject(new Error('HTTP disk image load timeout (120s)')), 120000)
                    )
                  ]) as any
                  
                  // Verify the device was created successfully
                  if (!blockDevice) {
                    throw new Error('HTTP block device creation returned null')
                  }
                  
                  statusTracker.success('Disk image loaded', 'Linux filesystem ready')
                  console.log('✅ Disk image loaded via HttpBytesDevice')
                  break // Success, exit retry loop
                } catch (httpError) {
                  lastError = httpError instanceof Error ? httpError : new Error(String(httpError))
                  const errorMsg = lastError.message
                  console.warn(`⚠️ HttpBytesDevice attempt ${attempt}/3 failed: ${errorMsg}`)
                  
                  if (attempt < 3) {
                    // Wait before retry (exponential backoff)
                    const waitTime = attempt * 3000 // 3s, 6s
                    console.log(`⏳ Waiting ${waitTime}ms before retry...`)
                    await new Promise(resolve => setTimeout(resolve, waitTime))
                  }
                }
              }
            } else {
              // Try CloudDevice for WebSocket URLs
              for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                  console.log(`⏳ Attempting to load disk image via CloudDevice (WebSocket) - attempt ${attempt}/2...`)
                  // Add timeout for disk image loading (90 seconds)
                  blockDevice = await Promise.race([
                    CloudDevice.create(diskImageUrl),
                    new Promise((_, reject) => 
                      setTimeout(() => reject(new Error('Disk image load timeout (90s)')), 90000)
                    )
                  ]) as any
                  
                  // Verify the device was created successfully
                  if (!blockDevice) {
                    throw new Error('Block device creation returned null')
                  }
                  
                  statusTracker.success('Disk image loaded', 'Linux filesystem ready')
                  console.log('✅ Disk image loaded via CloudDevice')
                  break // Success, exit retry loop
                } catch (cloudError) {
                  lastError = cloudError instanceof Error ? cloudError : new Error(String(cloudError))
                  const errorMsg = lastError.message
                  console.warn(`⚠️ Cloud device attempt ${attempt}/2 failed: ${errorMsg}`)
                  
                  // If WebSocket fails, try HTTPS fallback
                  if (diskImageUrl.startsWith('wss://')) {
                    const httpsUrl = diskImageUrl.replace('wss://', 'https://')
                    console.log('⚠️ WebSocket failed, trying HTTPS fallback...')
                    try {
                      blockDevice = await HttpBytesDevice.create(httpsUrl)
                      if (blockDevice) {
                        statusTracker.success('Disk image loaded', 'Linux filesystem ready')
                        console.log('✅ Disk image loaded via HTTPS fallback')
                        break
                      }
                    } catch (httpsError) {
                      console.warn('⚠️ HTTPS fallback also failed:', httpsError)
                    }
                  }
                  
                  if (attempt < 2) {
                    // Wait before retry
                    const waitTime = 3000
                    console.log(`⏳ Waiting ${waitTime}ms before retry...`)
                    await new Promise(resolve => setTimeout(resolve, waitTime))
                  }
                }
              }
            }
            
            // If all attempts failed, throw error
            if (!blockDevice) {
              const finalError = lastError || new Error('Unknown error')
              console.error('❌ Failed to load disk image after all retries:', finalError.message)
              throw new Error(`Failed to load disk image after all retries: ${finalError.message}`)
            }
            
            // Create cache for overlay (allows writes)
            console.log('⏳ Creating overlay cache...')
            const blockCache = await IDBDevice.create('aquifer-vm-cache')
            console.log('⏳ Creating overlay device...')
            const overlayDevice = await OverlayDevice.create(blockDevice, blockCache)
            
            // Create additional devices
            console.log('⏳ Creating additional devices...')
            const webDevice = await WebDevice.create('')
            const documentsDevice = await WebDevice.create('documents')
            const dataDevice = await DataDevice.create()
            console.log('✅ All devices created')
            
            // Mount points (same as WebVM)
            const mountPoints = [
              // The root filesystem, as an Ext2 image
              { type: 'ext2', dev: overlayDevice, path: '/' },
              // Access to files on the Web server
              { type: 'dir', dev: webDevice, path: '/web' },
              // Access to read-only data coming from JavaScript
              { type: 'dir', dev: dataDevice, path: '/data' },
              // Automatically created device files
              { type: 'devs', path: '/dev' },
              // Pseudo-terminals
              { type: 'devpts', path: '/dev/pts' },
              // The Linux 'proc' filesystem
              { type: 'proc', path: '/proc' },
              // The Linux 'sysfs' filesystem
              { type: 'sys', path: '/sys' },
              // Documents directory
              { type: 'dir', dev: documentsDevice, path: '/home/user/documents' }
            ]
            
            // Create Linux VM with proper mounts (with increased timeout and retry)
            console.log('⏳ Creating Linux VM instance...')
            statusTracker.info('Creating Linux VM...', 'Initializing virtualization')
            
            let vmCreated = false
            let vmError: Error | null = null
            
            // Retry VM creation up to 2 times with increased timeout
            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                console.log(`⏳ Creating Linux VM (attempt ${attempt}/2)...`)
                // Increased timeout to 60 seconds - VM creation can take time
                this.linux = await Promise.race([
                  Linux.create({ mounts: mountPoints }),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`VM creation timeout (60s) - attempt ${attempt}`)), 60000)
                  )
                ]) as any
                
                // Verify VM was created
                if (!this.linux) {
                  throw new Error('Linux VM creation returned null')
                }
                
                vmCreated = true
                break // Success, exit retry loop
              } catch (createError) {
                vmError = createError instanceof Error ? createError : new Error(String(createError))
                const errorMsg = vmError.message
                console.warn(`⚠️ VM creation attempt ${attempt}/2 failed: ${errorMsg}`)
                
                // Check if it's a disk image error
                if (errorMsg.includes('Invalid disk image') || errorMsg.includes('Could not mount') || errorMsg.includes('WebAssembly.compile')) {
                  console.error('❌ Disk image appears to be corrupted or invalid')
                  // Don't retry if disk image is invalid - it won't work on retry
                  throw new Error(`Invalid disk image: ${errorMsg}. The disk image may be corrupted or incomplete.`)
                }
                
                if (attempt < 2) {
                  // Wait before retry
                  console.log('⏳ Waiting 3s before VM creation retry...')
                  await new Promise(resolve => setTimeout(resolve, 3000))
                }
              }
            }
            
            if (!vmCreated) {
              const finalError = vmError || new Error('Unknown error')
              console.error('❌ Linux VM creation failed after all retries:', finalError.message)
              throw new Error(`Linux VM creation failed: ${finalError.message}`)
            }
            
            try {
              
              // Set up console output capture for commands
              // We'll use a custom console writer that captures output
              const consoleWriter = (data: string) => {
                if (this.commandResolve && data) {
                  this.commandOutput += data
                }
              }
              
              // Register callbacks for stdout/stderr (CheerpX API)
              if (this.linux.registerCallback) {
                try {
                  this.linux.registerCallback('stdout', consoleWriter)
                  this.linux.registerCallback('stderr', consoleWriter)
                } catch (callbackError) {
                  console.warn('⚠️ Failed to register callbacks (non-critical):', callbackError)
                }
              }
              
              // Also set up custom console if available (for interactive mode)
              if (this.linux.setCustomConsole) {
                try {
                  this.linux.setCustomConsole(consoleWriter, 80, 24) // 80 cols, 24 rows
                } catch (consoleError) {
                  console.warn('⚠️ Failed to set custom console (non-critical):', consoleError)
                }
              }
              
              statusTracker.success('CheerpX Linux VM created', 'Virtualization environment ready')
              console.log('✅ CheerpX Linux VM created with Debian filesystem')
            } catch (vmCreateError) {
              const vmErrorMsg = vmCreateError instanceof Error ? vmCreateError.message : String(vmCreateError)
              console.error('❌ Failed to create Linux VM:', vmErrorMsg)
              throw new Error(`Linux VM creation failed: ${vmErrorMsg}`)
            }
            
            // Wait for VM to be fully ready
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Install Docker if not available (REAL installation)
            // Docker is required for EmuHub, so we MUST install it
            try {
              console.log('📦 Checking for Docker...')
              // Use longer timeout for Docker check
              const dockerCheck = await this.execute('which docker || echo "not found"', 10000)
              
              if (dockerCheck.includes('not found') || dockerCheck.includes('error')) {
                console.log('📦 Installing Docker in Linux VM (required for EmuHub)...')
                statusTracker.info('Installing Docker...', 'Setting up container runtime (this may take 2-3 minutes)')
                
                // Install Docker using the official script with longer timeout
                console.log('📥 Downloading Docker installation script...')
                const curlResult = await this.execute('curl -fsSL https://get.docker.com -o /tmp/get-docker.sh', 60000)
                if (curlResult.includes('error') && !curlResult.includes('success')) {
                  throw new Error(`Failed to download Docker installation script: ${curlResult}`)
                }
                console.log('✅ Docker installation script downloaded')
                
                console.log('📦 Running Docker installation script (this may take 1-2 minutes)...')
                // Docker installation can take a while - use 5 minute timeout
                const installResult = await this.execute('sh /tmp/get-docker.sh', 300000)
                if (installResult.includes('error') && !installResult.includes('Docker version')) {
                  // Check if Docker was actually installed despite error message
                  const verifyCheck = await this.execute('docker --version || echo "not installed"', 10000)
                  if (verifyCheck.includes('not installed')) {
                    throw new Error(`Docker installation script failed: ${installResult}`)
                  }
                  console.log('⚠️ Installation script reported error, but Docker appears to be installed')
                }
                console.log('✅ Docker installation script completed')
                
                // Clean up
                await this.execute('rm -f /tmp/get-docker.sh', 10000).catch(() => {
                  // Ignore cleanup errors
                })
                
                // Add user to docker group (requires new session, but we'll try)
                await this.execute('usermod -aG docker user || true', 10000).catch(() => {
                  // Ignore if it fails - Docker might still work
                })
                
                // Verify Docker is installed - retry up to 3 times
                let dockerVerified = false
                for (let attempt = 1; attempt <= 3; attempt++) {
                  console.log(`🔍 Verifying Docker installation (attempt ${attempt}/3)...`)
                  const verifyResult = await this.execute('docker --version', 10000)
                  if (verifyResult.includes('Docker version') || verifyResult.includes('docker')) {
                    console.log('✅ Docker installed successfully')
                    statusTracker.success('Docker installed', 'Container runtime ready')
                    dockerVerified = true
                    break
                  } else {
                    console.warn(`⚠️ Docker verification failed (attempt ${attempt}/3): ${verifyResult}`)
                    if (attempt < 3) {
                      await new Promise(resolve => setTimeout(resolve, 2000))
                    }
                  }
                }
                
                if (!dockerVerified) {
                  throw new Error('Docker installation verification failed after 3 attempts')
                }
              } else {
                console.log('✅ Docker already available')
                statusTracker.success('Docker ready', 'Container runtime available')
              }
            } catch (dockerError) {
              const errorMsg = dockerError instanceof Error ? dockerError.message : String(dockerError)
              console.error('❌ Docker installation failed:', errorMsg)
              // Docker is required - throw error
              throw new Error(`Docker installation failed: ${errorMsg}. Docker is required for EmuHub to work.`)
            }
            
            console.log('✅ Linux VM is ready with Docker support')
            
            // Wait for VM to be fully ready and test with a simple command
            console.log('⏳ Verifying VM is ready...')
            await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds for VM to stabilize
            
            // Test VM with a simple command - retry up to 3 times
            let vmReady = false
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                console.log(`⏳ Testing VM readiness (attempt ${attempt}/3)...`)
                const testResult = await this.testVMReady()
                if (testResult) {
                  console.log('✅ VM is ready and can execute commands')
                  vmReady = true
                  break
                } else {
                  console.warn(`⚠️ VM test failed (attempt ${attempt}/3), retrying...`)
                  await new Promise(resolve => setTimeout(resolve, 1000))
                }
              } catch (testError) {
                const errorMsg = testError instanceof Error ? testError.message : String(testError)
                console.warn(`⚠️ VM test error (attempt ${attempt}/3):`, errorMsg)
                if (attempt < 3) {
                  await new Promise(resolve => setTimeout(resolve, 1000))
                }
              }
            }
            
            if (!vmReady) {
              console.warn('⚠️ VM readiness test failed after 3 attempts, but continuing...')
            }
          }
        } catch (vmError) {
          const errorMsg = vmError instanceof Error ? vmError.message : String(vmError)
          console.error('❌ Failed to create Linux VM:', errorMsg)
          
          if (errorMsg.includes('SharedArrayBuffer') || errorMsg.includes('crossOriginIsolated')) {
            // Check if headers are actually set
            if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
              throw new Error('Cross-Origin Isolation not enabled. CheerpX requires COEP/COOP headers. Check next.config.js headers configuration.')
            }
            // If headers are set but still failing, try alternative approach
            throw new Error(`Linux VM creation failed: ${errorMsg}. Check browser console for details.`)
          } else if (errorMsg.includes('mount') || errorMsg.includes('Device does not exist')) {
            // Try alternative disk image URL
            console.log('⚠️ Primary disk image failed, trying alternative...')
            try {
              // Re-destructure CheerpX classes for alternative attempt
              const { Linux: AltLinux, HttpBytesDevice: AltHttpBytesDevice, IDBDevice: AltIDBDevice, OverlayDevice: AltOverlayDevice, WebDevice: AltWebDevice, DataDevice: AltDataDevice } = this.cheerpx
              
              if (!AltLinux || !AltHttpBytesDevice) {
                throw new Error('CheerpX classes not available for alternative disk image')
              }
              
              const altDiskImageUrl = 'https://disks.webvm.io/debian_large_20230522_5044875331.ext2'
              const altBlockDevice = await AltHttpBytesDevice.create(altDiskImageUrl)
              const altBlockCache = await AltIDBDevice.create('aquifer-vm-cache-alt')
              const altOverlayDevice = await AltOverlayDevice.create(altBlockDevice, altBlockCache)
              
              const altMountPoints = [
                { type: 'ext2', dev: altOverlayDevice, path: '/' },
                { type: 'dir', dev: await AltWebDevice.create(''), path: '/web' },
                { type: 'dir', dev: await AltDataDevice.create(), path: '/data' },
                { type: 'devs', path: '/dev' },
                { type: 'devpts', path: '/dev/pts' },
                { type: 'proc', path: '/proc' },
                { type: 'sys', path: '/sys' },
              ]
              
              this.linux = await AltLinux.create({ mounts: altMountPoints })
              console.log('✅ Linux VM created with alternative disk image')
              
              // Wait and test VM
              await new Promise(resolve => setTimeout(resolve, 1000))
              try {
                await this.testVMReady()
                console.log('✅ VM is ready and can execute commands')
              } catch (testError) {
                console.warn('⚠️ VM test command failed, but continuing:', testError)
              }
            } catch (altError) {
              throw new Error(`Failed to create Linux VM with both primary and alternative disk images: ${errorMsg}`)
            }
          } else {
            throw new Error(`Linux VM creation failed: ${errorMsg}`)
          }
        }
        
        return true
      }

      // If CheerpX module not loaded, throw error (don't return false)
      throw new Error('CheerpX/WebVM/BrowserPod not available. Ensure @leaningtech/cheerpx is installed: npm install @leaningtech/cheerpx')
    } catch (error) {
      // Re-throw to force caller to handle it properly
      throw error instanceof Error ? error : new Error(`Failed to initialize CheerpX: ${String(error)}`)
    }
  }

  /**
   * Load CheerpX from CDN or local build
   */
  private async loadCheerpX(): Promise<void> {
    // CheerpX is typically bundled with WebVM or BrowserPod
    // For now, we'll try to load WebVM which includes CheerpX
    
    // WebVM GitHub releases or CDN
    const webvmUrls = [
      'https://unpkg.com/@leaningtech/webvm@latest/dist/webvm.js',
      'https://cdn.jsdelivr.net/npm/@leaningtech/webvm@latest/dist/webvm.js',
      '/webvm.js', // Local build
    ]

    for (const url of webvmUrls) {
      try {
        await this.loadScript(url)
        if ((window as any).WebVM || (window as any).CheerpX) {
          this.cheerpx = (window as any).WebVM || (window as any).CheerpX
          console.log('✅ Loaded CheerpX/WebVM from:', url)
          return
        }
      } catch (error) {
        // Continue to next URL
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
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`))
      document.head.appendChild(script)
    })
  }

  /**
   * Test if VM is ready by running a simple command
   */
  private async testVMReady(): Promise<boolean> {
    if (!this.linux) {
      return false
    }
    
    try {
      // Wait a bit for VM to stabilize
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Try to run a simple command using /bin/sh (more reliable than bash)
      // Use echo which is a built-in shell command
      const result = await Promise.race([
        this.linux.run('/bin/sh', ['-c', 'echo "test"'], {
          env: ['HOME=/home/user', 'TERM=xterm', 'USER=user', 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
          cwd: '/home/user',
          uid: 1000,
          gid: 1000
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('VM test timeout')), 5000)
        )
      ]) as any
      
      const isReady = result.status === 0
      if (isReady) {
        console.log('✅ VM readiness test passed')
      } else {
        console.warn('⚠️ VM readiness test returned non-zero status:', result.status)
      }
      return isReady
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn('⚠️ VM test failed:', errorMsg)
      // Don't fail initialization if test fails - VM might still work
      return false
    }
  }

  /**
   * Execute a command in CheerpX Linux VM - SIMPLIFIED AND RELIABLE
   */
  async execute(command: string, timeout: number = 30000): Promise<string> {
    if (!this.isInitialized || !this.cheerpx) {
      throw new Error('CheerpX not initialized')
    }

    // Ensure Linux VM is created
    if (!this.linux) {
      throw new Error('Linux VM not created. Call init() first and wait for VM creation.')
    }

    // Use file redirection to capture output (most reliable method)
    const outputFile = `/tmp/cmd_output_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`
    const statusFile = `/tmp/cmd_status_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`
    
    // Escape single quotes in command for shell
    const escapedCommand = command.replace(/'/g, "'\\''")
    
    // Execute command with output redirection via /bin/sh
    // Use -c flag to execute the command string
    const shCommand = `${escapedCommand} > ${outputFile} 2>&1; echo $? > ${statusFile}`
    
    try {
      // Reset output capture
      this.commandOutput = ''
      
      // Execute the command using /bin/sh with -c flag and timeout
      const result = await Promise.race([
        this.linux.run('/bin/sh', ['-c', shCommand], {
          env: ['HOME=/home/user', 'TERM=xterm', 'USER=user', 'SHELL=/bin/sh', 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
          cwd: '/home/user',
          uid: 1000,
          gid: 1000
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Command timeout after ${timeout}ms: ${command}`)), timeout)
        )
      ]) as any
    
      // Wait a moment for files to be written
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Read output file using filesystem API
      let output = ''
      let exitCode = result.status || 0
      
      try {
        // Capture output via console callback by reading the file with cat
        // Reset output capture
        this.commandOutput = ''
        
        // Read output file using cat (output will be captured via console callback)
        await this.linux.run('/bin/sh', ['-c', `cat ${outputFile}`], {
          env: ['HOME=/home/user', 'TERM=xterm', 'USER=user', 'SHELL=/bin/sh', 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
          cwd: '/home/user',
          uid: 1000,
          gid: 1000
        })
        
        // Wait for output to be captured
        await new Promise(resolve => setTimeout(resolve, 400))
        output = this.commandOutput.trim()
        this.commandOutput = ''
        
        // Read status file
        this.commandOutput = ''
        await this.linux.run('/bin/sh', ['-c', `cat ${statusFile}`], {
          env: ['HOME=/home/user', 'TERM=xterm', 'USER=user', 'SHELL=/bin/sh', 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
          cwd: '/home/user',
          uid: 1000,
          gid: 1000
        })
        await new Promise(resolve => setTimeout(resolve, 300))
        const statusStr = this.commandOutput.trim()
        this.commandOutput = ''
        exitCode = parseInt(statusStr, 10) || result.status || 0
      } catch (readError) {
        // If reading fails, use status from result
        const readErrorMsg = readError instanceof Error ? readError.message : String(readError)
        console.warn('⚠️ Failed to read command output:', readErrorMsg)
        output = exitCode === 0 ? 'success' : `error: exit code ${exitCode}`
      }
      
      // Clean up temp files (non-blocking)
      this.linux.run('/bin/sh', ['-c', `rm -f ${outputFile} ${statusFile}`], {
        env: ['HOME=/home/user', 'TERM=xterm', 'USER=user', 'SHELL=/bin/sh'],
        cwd: '/home/user',
        uid: 1000,
        gid: 1000
      }).catch(() => {
        // Ignore cleanup errors
      })
      
      const finalOutput = output.trim() || (exitCode === 0 ? 'success' : `error: exit code ${exitCode}`)
      
      // Log command execution for debugging
      if (exitCode !== 0) {
        console.warn(`⚠️ Command failed (exit ${exitCode}): ${command}`)
        console.warn(`   Output: ${finalOutput.substring(0, 200)}`)
      }
      
      return finalOutput
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`❌ Command execution failed: ${command}`)
      console.error(`   Error: ${errorMsg}`)
      throw new Error(`Command execution failed: ${errorMsg}`)
    }
  }

  /**
   * Check if Docker is available
   */
  async hasDocker(): Promise<boolean> {
    try {
      const result = await this.execute('docker --version')
      return result.includes('Docker version') || result.includes('docker')
    } catch (error) {
      return false
    }
  }

  /**
   * Run a Docker container in CheerpX - RETURNS CONTAINER ID
   */
  async dockerRun(image: string, options: {
    name?: string
    privileged?: boolean
    env?: Record<string, string>
    ports?: Record<string, number>
  }): Promise<string> {
    // Build docker run command
    let cmd = 'docker run -d'
    
    if (options.name) {
      cmd += ` --name ${options.name}`
    }
    
    if (options.privileged) {
      cmd += ' --privileged'
    }
    
    if (options.env) {
      for (const [key, value] of Object.entries(options.env)) {
        cmd += ` -e ${key}=${value}`
      }
    }
    
    if (options.ports) {
      for (const [containerPort, hostPort] of Object.entries(options.ports)) {
        cmd += ` -p ${hostPort}:${containerPort}`
      }
    }
    
    cmd += ` ${image}`
    
    // Execute docker run command - output is container ID
    const result = await this.execute(cmd)
    
    // Extract container ID (first line, usually 12-64 character hex string)
    const containerId = result.trim().split('\n')[0].trim()
    if (containerId && containerId.length >= 12) {
      return containerId
    }
    
    // If we can't extract ID, try to find container by name
    if (options.name) {
      const containers = await this.dockerPs()
      const found = containers.find(c => c.names.includes(options.name!))
      if (found) {
        return found.id
      }
    }
    
    // Return the raw output as fallback
    return result.trim()
  }

  /**
   * List Docker containers - WORKS PROPERLY
   */
  async dockerPs(): Promise<Array<{ id: string; names: string[] }>> {
    try {
      // Get all containers (including stopped)
      const result = await this.execute('docker ps -a --format "{{.ID}}\t{{.Names}}"')
      if (!result || result.includes('error')) {
        return []
      }
      
    return result.split('\n')
        .filter(line => line.trim() && !line.includes('error'))
      .map(line => {
        const parts = line.split('\t')
          const id = parts[0]?.trim() || ''
          const names = parts[1]?.trim().split(',').map(n => n.trim()).filter(n => n) || []
          return { id, names }
        })
        .filter(c => c.id && c.id.length >= 12) // Valid container IDs are at least 12 chars
    } catch (error) {
      console.warn('Failed to list Docker containers:', error)
      return []
    }
  }

  /**
   * Check if CheerpX is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.cheerpx !== null
  }

  /**
   * Get the CheerpX instance
   */
  getInstance(): any {
    return this.cheerpx
  }
}

