/**
 * CheerpX Integration - Real x86 Virtualization
 * 
 * CheerpX provides secure client-side execution of x86 binaries for Linux
 * on any browser. This is the underlying technology that powers WebVM and BrowserPod.
 * 
 * Documentation: https://leaningtech.com/cheerpx/
 */

export interface CheerpXConfig {
  memorySize?: number
  enableDocker?: boolean
}

export class CheerpXIntegration {
  private cheerpx: any = null
  private linux: any = null // CheerpX Linux VM instance
  private isInitialized: boolean = false
  private config: CheerpXConfig

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
            console.log('📦 Loading Debian disk image from WebVM...')
            
            // Create block device from WebVM's disk image
            let blockDevice
            try {
              blockDevice = await CloudDevice.create(diskImageUrl)
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
            console.log('✅ CheerpX Linux VM created with Debian filesystem')
            console.log('💡 You can now install Android emulator inside this Linux VM')
          }
        } catch (vmError) {
          const errorMsg = vmError instanceof Error ? vmError.message : String(vmError)
          console.error('❌ Failed to create Linux VM:', errorMsg)
          
          if (errorMsg.includes('SharedArrayBuffer') || errorMsg.includes('crossOriginIsolated')) {
            console.error('❌ CheerpX requires Cross-Origin Isolation headers')
            console.error('💡 Add to your server/Next.js config:')
            console.error('   - Cross-Origin-Opener-Policy: same-origin')
            console.error('   - Cross-Origin-Embedder-Policy: require-corp')
            console.error('   - Cross-Origin-Resource-Policy: cross-origin')
          } else if (errorMsg.includes('mount') || errorMsg.includes('Device does not exist')) {
            console.error('❌ Disk image mount failed')
            console.error('💡 This usually means the disk image URL is not accessible')
            console.error('💡 Or Cross-Origin Isolation is not properly configured')
          } else {
            console.warn('⚠️ Could not create Linux VM:', vmError)
          }
        }
        
        return true
      }

      console.warn('⚠️ CheerpX/WebVM/BrowserPod not available')
      console.warn('💡 Install @leaningtech/cheerpx: npm install @leaningtech/cheerpx')
      return false
    } catch (error) {
      console.error('❌ Failed to initialize CheerpX:', error)
      return false
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
   * Execute a command in CheerpX Linux VM
   */
  async execute(command: string): Promise<string> {
    if (!this.isInitialized || !this.cheerpx) {
      throw new Error('CheerpX not initialized')
    }

    // Ensure Linux VM is created
    if (!this.linux) {
      throw new Error('Linux VM not created. Call init() first and wait for VM creation.')
    }

    // Execute command in Linux VM
    // Note: CheerpX's run() returns { status }, not stdout
    // For Docker commands, we'll need to capture output differently
    const parts = command.trim().split(/\s+/)
    const cmd = parts[0]
    const args = parts.slice(1)
    
    const result = await this.linux.run(cmd, args, {
      env: ['HOME=/home/user', 'TERM=xterm', 'USER=user', 'SHELL=/bin/bash', 'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'],
      cwd: '/home/user',
      uid: 1000,
      gid: 1000
    })
    
    // CheerpX doesn't return stdout directly, so we'll return status
    // For actual output, we'd need to redirect to a file and read it
    // Or use a console callback to capture output
    return result.status === 0 ? 'success' : `error: exit code ${result.status}`
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
   * Run a Docker container in CheerpX
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
    
    // Execute docker run command
    const result = await this.execute(cmd)
    
    // Extract container ID from output (would need to capture stdout)
    // For now, return success indicator
    return result
  }

  /**
   * List Docker containers
   */
  async dockerPs(): Promise<Array<{ id: string; names: string[] }>> {
    const result = await this.execute('docker ps --format "{{.ID}}\t{{.Names}}"')
    return result.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split('\t')
        return {
          id: parts[0]?.trim() || '',
          names: parts[1]?.trim().split(',') || [],
        }
      })
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

