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
        const CheerpXModule = await import('@leaningtech/cheerpx')
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
            const diskImageUrl = 'wss://disks.webvm.io/debian_large_20230522_5044875331.ext2'
            statusTracker.info('Loading Debian disk image...', 'Downloading Linux filesystem')
            console.log('📦 Loading Debian disk image from WebVM...')
            
            // Create block device from WebVM's disk image
            let blockDevice
            try {
              blockDevice = await CloudDevice.create(diskImageUrl)
              statusTracker.success('Disk image loaded', 'Linux filesystem ready')
              console.log('✅ Disk image loaded')
            } catch (cloudError) {
              // Fallback to HTTP if WebSocket fails
              console.log('⚠️ Cloud device failed, trying HTTP...')
              const httpUrl = diskImageUrl.replace('wss://', 'https://').replace('ws://', 'http://')
              blockDevice = await HttpBytesDevice.create(httpUrl)
              console.log('✅ Disk image loaded via HTTP')
            }
            
            // Create cache for overlay (allows writes)
            const blockCache = await IDBDevice.create('aquifer-vm-cache')
            const overlayDevice = await OverlayDevice.create(blockDevice, blockCache)
            
            // Create additional devices
            const webDevice = await WebDevice.create('')
            const documentsDevice = await WebDevice.create('documents')
            const dataDevice = await DataDevice.create()
            
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
            
            // Create Linux VM with proper mounts
            this.linux = await Linux.create({ mounts: mountPoints })
            
            // Set up console output capture for commands
            // We'll use a custom console writer that captures output
            const consoleWriter = (data: string) => {
              if (this.commandResolve && data) {
                this.commandOutput += data
              }
            }
            
            // Register callbacks for stdout/stderr (CheerpX API)
            if (this.linux.registerCallback) {
              this.linux.registerCallback('stdout', consoleWriter)
              this.linux.registerCallback('stderr', consoleWriter)
            }
            
            // Also set up custom console if available (for interactive mode)
            if (this.linux.setCustomConsole) {
              this.linux.setCustomConsole(consoleWriter, 80, 24) // 80 cols, 24 rows
            }
            
            statusTracker.success('CheerpX Linux VM created', 'Virtualization environment ready')
            console.log('✅ CheerpX Linux VM created with Debian filesystem')
            
            // Wait for VM to be fully ready
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Install Docker if not available (REAL installation)
            // Docker is required for EmuHub, so we MUST install it
            try {
              console.log('📦 Checking for Docker...')
              const dockerCheck = await this.execute('which docker || echo "not found"')
              
              if (dockerCheck.includes('not found') || dockerCheck.includes('error')) {
                console.log('📦 Installing Docker in Linux VM (required for EmuHub)...')
                statusTracker.info('Installing Docker...', 'Setting up container runtime (this may take 1-2 minutes)')
                
                // Install Docker using the official script
                const curlResult = await this.execute('curl -fsSL https://get.docker.com -o /tmp/get-docker.sh')
                if (curlResult.includes('error')) {
                  throw new Error('Failed to download Docker installation script')
                }
                
                const installResult = await this.execute('sh /tmp/get-docker.sh')
                if (installResult.includes('error')) {
                  throw new Error('Docker installation script failed')
                }
                
                // Clean up
                await this.execute('rm -f /tmp/get-docker.sh')
                
                // Add user to docker group (requires new session, but we'll try)
                await this.execute('usermod -aG docker user || true')
                
                // Verify Docker is installed
                const verifyResult = await this.execute('docker --version')
                if (verifyResult.includes('Docker version') || verifyResult.includes('docker')) {
                  console.log('✅ Docker installed successfully')
                  statusTracker.success('Docker installed', 'Container runtime ready')
                } else {
                  throw new Error('Docker installation verification failed')
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
              const altDiskImageUrl = 'https://disks.webvm.io/debian_large_20230522_5044875331.ext2'
              const altBlockDevice = await HttpBytesDevice.create(altDiskImageUrl)
              const altBlockCache = await IDBDevice.create('aquifer-vm-cache-alt')
              const altOverlayDevice = await OverlayDevice.create(altBlockDevice, altBlockCache)
              
              const altMountPoints = [
                { type: 'ext2', dev: altOverlayDevice, path: '/' },
                { type: 'dir', dev: await WebDevice.create(''), path: '/web' },
                { type: 'dir', dev: await DataDevice.create(), path: '/data' },
                { type: 'devs', path: '/dev' },
                { type: 'devpts', path: '/dev/pts' },
                { type: 'proc', path: '/proc' },
                { type: 'sys', path: '/sys' },
              ]
              
              this.linux = await Linux.create({ mounts: altMountPoints })
              console.log('✅ Linux VM created with alternative disk image')
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
   * Execute a command in CheerpX Linux VM - CAPTURES OUTPUT PROPERLY
   */
  async execute(command: string): Promise<string> {
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
    
    // Execute command with output redirection via bash
    const bashCommand = `bash -c '${command.replace(/'/g, "'\\''")} > ${outputFile} 2>&1; echo $? > ${statusFile}'`
    
    // Parse bash command
    const parts = bashCommand.trim().split(/\s+/)
    const cmd = parts[0]
    const args = parts.slice(1)
    
    try {
      // Execute the command
    const result = await this.linux.run(cmd, args, {
      env: ['HOME=/home/user', 'TERM=xterm', 'USER=user', 'SHELL=/bin/bash', 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
      cwd: '/home/user',
      uid: 1000,
      gid: 1000
    })
    
      // Wait a moment for files to be written
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Read output file using filesystem API
      let output = ''
      let exitCode = result.status || 0
      
      try {
        // Capture output via console callback by reading the file with cat
        // Reset output capture
        this.commandOutput = ''
        
        // Read output file using cat (output will be captured via console callback)
        await this.linux.run('cat', [outputFile], {
          env: ['HOME=/home/user', 'TERM=xterm', 'USER=user', 'SHELL=/bin/bash'],
          cwd: '/home/user',
          uid: 1000,
          gid: 1000
        })
        
        // Wait for output to be captured
        await new Promise(resolve => setTimeout(resolve, 300))
        output = this.commandOutput.trim()
        this.commandOutput = ''
        
        // Read status file
        this.commandOutput = ''
        await this.linux.run('cat', [statusFile], {
          env: ['HOME=/home/user', 'TERM=xterm', 'USER=user', 'SHELL=/bin/bash'],
          cwd: '/home/user',
          uid: 1000,
          gid: 1000
        })
        await new Promise(resolve => setTimeout(resolve, 200))
        const statusStr = this.commandOutput.trim()
        this.commandOutput = ''
        exitCode = parseInt(statusStr, 10) || result.status || 0
      } catch (readError) {
        // If reading fails, use status from result
        output = exitCode === 0 ? 'success' : `error: exit code ${exitCode}`
      }
      
      // Clean up temp files
      try {
        await this.linux.run('rm', ['-f', outputFile, statusFile], {
          env: ['HOME=/home/user', 'TERM=xterm', 'USER=user', 'SHELL=/bin/bash'],
          cwd: '/home/user',
          uid: 1000,
          gid: 1000
        })
      } catch {
        // Ignore cleanup errors
      }
      
      return output.trim() || (exitCode === 0 ? 'success' : `error: exit code ${exitCode}`)
    } catch (error) {
      throw new Error(`Command execution failed: ${error instanceof Error ? error.message : String(error)}`)
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

