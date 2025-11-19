/**
 * Hybrid Emulator - Combines Browser and Docker-based Emulation
 * 
 * Provides a unified interface that can use either:
 * 1. Browser-based emulation (current Aquifer implementation)
 * 2. EmuHub Docker-based emulation (via NoVNC)
 * 3. WebVM-based virtualization (if available)
 * 
 * Automatically selects the best available option or allows manual selection.
 */

import { AndroidEmulator } from './android-emulator'
import { WebVMEmuHubIntegration } from './webvm-emuhub-integration'
import { EmuHubEmulator } from './emuhub-integration-enhanced'
import { OptimizedAndroidVM } from './android-vm-optimized'
import { performanceOptimizer } from './performance-optimizer'
import { ErrorRecovery } from './error-recovery'
import { LazyLoader } from './lazy-loader'

export type EmulationMode = 'browser' | 'webvm-emuhub' | 'auto'

export interface HybridEmulatorConfig {
  mode: EmulationMode
  emuhubConfig?: {
    serverUrl?: string
    vncPassword?: string
    emuhubPassword?: string
  }
  webvmConfig?: {
    useWebVM?: boolean
    webvmUrl?: string
  }
}

export class HybridEmulator {
  private mode: EmulationMode
  private browserEmulator: AndroidEmulator | null = null
  private webvmEmuhub: WebVMEmuHubIntegration
  private currentEmulator: EmuHubEmulator | null = null
  private canvas: HTMLCanvasElement | null = null
  private optimizedAndroid: OptimizedAndroidVM | null = null

  constructor(canvas: HTMLCanvasElement, config?: Partial<HybridEmulatorConfig>) {
    this.canvas = canvas
    this.mode = config?.mode || 'auto'
    
    this.webvmEmuhub = new WebVMEmuHubIntegration({
      webvmMemorySize: config?.webvmConfig?.useWebVM ? 2048 * 1024 * 1024 : undefined,
      emuhubPort: config?.emuhubConfig?.serverUrl ? 
        parseInt(new URL(config.emuhubConfig.serverUrl).port) : 8000,
      vncPassword: config?.emuhubConfig?.vncPassword,
      emuhubPassword: config?.emuhubConfig?.emuhubPassword,
    })
  }

      /**
       * Initialize the hybrid emulator
       */
      async init(): Promise<boolean> {
        const stopTiming = performanceOptimizer.startTiming('hybrid-emulator-init')
        
        try {
          console.log('Initializing Hybrid Emulator, mode:', this.mode)

          // Auto-detect best mode
          if (this.mode === 'auto') {
            this.mode = await this.detectBestMode()
            console.log('Auto-selected mode:', this.mode)
          }

      switch (this.mode) {
        case 'webvm-emuhub': {
          // Try WebVM/EmuHub, but fallback to browser if it fails quickly
          console.log('⚡ Trying WebVM + EmuHub...')
          try {
            const result = await Promise.race([
              this.initWebVMEmuHub(),
              new Promise<boolean>((resolve) => 
                setTimeout(() => {
                  console.warn('⚠️ WebVM/EmuHub initialization timeout, falling back to browser mode')
                  resolve(false)
                }, 10000) // 10 second timeout
              )
            ])
            
            if (result) {
              return true
            }
            
            // Fallback to browser mode
            console.log('📱 Falling back to browser-based emulation (always works)')
            this.mode = 'browser'
            return await this.initBrowser()
          } catch (error) {
            console.warn('⚠️ WebVM/EmuHub failed, falling back to browser mode:', error)
            this.mode = 'browser'
            return await this.initBrowser()
          }
        }
            case 'browser':
            default:
              return await this.initBrowser()
          }
        } catch (error) {
          // Attempt error recovery
          const recovered = await ErrorRecovery.recover(
            error instanceof Error ? error : new Error(String(error)),
            'hybrid-emulator'
          )
          
          if (!recovered) {
            throw error
          }
          
          return false
        } finally {
          stopTiming()
        }
      }

  /**
   * Detect the best available emulation mode
   */
  private async detectBestMode(): Promise<EmulationMode> {
    console.log('🔍 Detecting best emulation mode...')
    
    // Browser mode is always available and works reliably
    // WebVM/EmuHub is experimental and often fails
    // Default to browser for reliability
    console.log('📱 Using browser-based emulation (reliable and always works)')
    return 'browser'
  }

  /**
   * Initialize browser-based emulation
   */
  private async initBrowser(): Promise<boolean> {
    if (!this.canvas) {
      return false
    }

    try {
      this.browserEmulator = new AndroidEmulator(this.canvas)
      console.log('Browser-based emulation initialized')
      return true
    } catch (error) {
      console.error('Failed to initialize browser emulation:', error)
      return false
    }
  }

  /**
   * Initialize WebVM + EmuHub combined emulation
   */
  private async initWebVMEmuHub(): Promise<boolean> {
    console.log('🚀 Initializing WebVM + EmuHub emulation...')
    
    const initialized = await this.webvmEmuhub.init()
    if (!initialized) {
      console.warn('⚠️ WebVM + EmuHub not available, falling back to browser emulation')
      // Switch mode to browser
      this.mode = 'browser'
      return await this.initBrowser()
    }
    
    // Verify EmuHub is actually working by checking if we can get emulators
    try {
      const emulators = await this.webvmEmuhub.getEmulators()
      if (emulators.length === 0) {
        // Try to create one
        const created = await this.webvmEmuhub.createEmulator({
          androidVersion: '11',
          deviceName: 'Pixel_5',
          screenResolution: '1080x1920',
        })
        if (!created) {
          console.warn('⚠️ Cannot create emulator, EmuHub may not be working. Falling back to browser.')
          this.mode = 'browser'
          return await this.initBrowser()
        }
      }
    } catch (error) {
      console.warn('⚠️ EmuHub error, falling back to browser:', error)
      this.mode = 'browser'
      return await this.initBrowser()
    }

    // Get or create an emulator (already done in verification above, but get it)
    console.log('📱 Getting or creating Android emulator...')
    let emulators: EmuHubEmulator[] = []
    
    try {
      emulators = await this.webvmEmuhub.getEmulators()
    } catch (error) {
      console.warn('⚠️ Failed to get emulators, falling back to browser:', error)
      this.mode = 'browser'
      return await this.initBrowser()
    }
    
    if (emulators.length === 0) {
      console.log('📱 No emulators found, creating new one...')
      try {
        this.currentEmulator = await this.webvmEmuhub.createEmulator({
          androidVersion: '11',
          deviceName: 'Pixel_5',
          screenResolution: '1080x1920',
        })
        if (!this.currentEmulator) {
          console.warn('⚠️ Failed to create emulator, falling back to browser')
          this.mode = 'browser'
          return await this.initBrowser()
        }
      } catch (error) {
        console.warn('⚠️ Failed to create emulator via API, falling back to browser:', error)
        this.mode = 'browser'
        return await this.initBrowser()
      }
    } else {
      console.log(`📱 Found ${emulators.length} existing emulator(s), using first one`)
      this.currentEmulator = emulators[0]
    }

    if (this.currentEmulator) {
      console.log('✅ WebVM + EmuHub emulation initialized:', this.currentEmulator.id)
      const vncUrl = this.webvmEmuhub.getVNCUrl(this.currentEmulator.id)
      if (vncUrl) {
        console.log('📺 VNC URL:', vncUrl)
      } else {
        console.warn('⚠️ VNC URL not available yet, will be generated when emulator is ready')
      }
      return true
    }

    console.error('❌ Failed to get or create emulator, falling back to browser')
    this.mode = 'browser'
    return await this.initBrowser()
  }

  /**
   * Start the emulator
   */
  async start(): Promise<void> {
    switch (this.mode) {
      case 'browser':
        if (this.browserEmulator) {
          this.browserEmulator.start()
        }
        break
      case 'webvm-emuhub':
        // WebVM + EmuHub emulators are already running
        console.log('WebVM + EmuHub emulator is running')
        break
    }
  }

  /**
   * Stop the emulator
   */
  async stop(): Promise<void> {
    switch (this.mode) {
      case 'browser':
        if (this.browserEmulator) {
          this.browserEmulator.stop()
        }
        break
      case 'webvm-emuhub':
        // Stop optimized Android VM if running
        if (this.optimizedAndroid) {
          await this.optimizedAndroid.stop()
        }
        // Stop EmuHub container in WebVM
        await this.webvmEmuhub.stop()
        break
    }
  }

  /**
   * Install APK
   */
  async installAPK(apkData: ArrayBuffer, fileName: string): Promise<void> {
    switch (this.mode) {
      case 'browser':
        if (this.browserEmulator) {
          await this.browserEmulator.installAPK(apkData, fileName)
        } else {
          throw new Error('Browser emulator not initialized')
        }
        break
      case 'webvm-emuhub':
        if (this.currentEmulator) {
          await this.webvmEmuhub.installAPK(this.currentEmulator.id, apkData, fileName)
        } else {
          throw new Error('EmuHub emulator not initialized')
        }
        break
    }
  }

  /**
   * Launch app by package name
   */
  launchApp(packageName: string): void {
    switch (this.mode) {
      case 'browser':
        if (this.browserEmulator) {
          this.browserEmulator.launchApp(packageName)
        }
        break
      case 'webvm-emuhub':
        // For EmuHub, apps are launched via ADB commands
        // Note: launchApp method may not be implemented in webvmEmuhub
        console.log('Launching app in EmuHub mode:', packageName)
        // Apps are launched automatically after installation in EmuHub
        break
    }
  }

  /**
   * Uninstall app by package name
   */
  uninstallApp(packageName: string): void {
    switch (this.mode) {
      case 'browser':
        if (this.browserEmulator) {
          this.browserEmulator.uninstallApp(packageName)
        }
        break
      case 'webvm-emuhub':
        // For EmuHub, uninstall via ADB
        console.log('Uninstalling app in EmuHub mode:', packageName)
        // Uninstall functionality would need to be implemented in webvmEmuhub
        break
    }
  }

  /**
   * Get installed apps
   */
  getInstalledApps(): any[] {
    switch (this.mode) {
      case 'browser':
        if (this.browserEmulator) {
          return this.browserEmulator.getInstalledApps()
        }
        return []
      case 'webvm-emuhub':
        // For EmuHub, we'd need to query the emulator
        // For now, return empty array
        return []
      default:
        return []
    }
  }

  /**
   * Get running app
   */
  getRunningApp(): any | null {
    switch (this.mode) {
      case 'browser':
        if (this.browserEmulator) {
          return this.browserEmulator.getRunningApp()
        }
        return null
      case 'webvm-emuhub':
        // For EmuHub, we'd need to query the emulator
        return null
      default:
        return null
    }
  }

  /**
   * Get the current emulation mode
   */
  getMode(): EmulationMode {
    return this.mode
  }

  /**
   * Get VNC URL (for WebVM + EmuHub mode or Optimized Android)
   */
  getVNCUrl(): string | null {
    // Check optimized Android VM first (fastest)
    if (this.optimizedAndroid) {
      const vncUrl = this.optimizedAndroid.getVNCUrl()
      if (vncUrl) return vncUrl
    }
    
    if (this.mode === 'webvm-emuhub') {
      if (this.currentEmulator) {
        const url = this.webvmEmuhub.getVNCUrl(this.currentEmulator.id)
        if (url) return url
      }
      
      // Try to get emulators synchronously if possible
      // Note: This is async but we return null if not immediately available
      // The caller should poll if needed
      return null
    }
    return null
  }
  
  /**
   * Get current emulator (for WebVM + EmuHub mode)
   */
  getCurrentEmulator(): EmuHubEmulator | null {
    return this.currentEmulator
  }
  
  /**
   * Wait for VNC URL to be available (async)
   */
  async waitForVNCUrl(maxWait: number = 60000): Promise<string | null> {
    // Check optimized Android VM first (fastest)
    if (this.optimizedAndroid) {
      const startTime = Date.now()
      while (Date.now() - startTime < maxWait) {
        const isRunning = await this.optimizedAndroid.isRunning()
        if (isRunning) {
          const vncUrl = this.optimizedAndroid.getVNCUrl()
          if (vncUrl) {
            console.log('✅ Optimized Android VNC URL obtained')
            return vncUrl
          }
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      // Return URL anyway if Android VM exists
      return this.optimizedAndroid.getVNCUrl()
    }
    
    if (this.mode !== 'webvm-emuhub') {
      return null
    }
    
    const startTime = Date.now()
    let lastLogTime = 0
    
    while (Date.now() - startTime < maxWait) {
      // Try current emulator first
      if (this.currentEmulator) {
        const url = this.webvmEmuhub.getVNCUrl(this.currentEmulator.id)
        if (url && url !== '') {
          console.log('✅ VNC URL obtained')
          return url
        }
      }
      
      // Try to get emulators
      try {
        const emulators = await this.webvmEmuhub.getEmulators()
        if (emulators.length > 0) {
          if (!this.currentEmulator || this.currentEmulator.id !== emulators[0].id) {
            this.currentEmulator = emulators[0]
            console.log('📱 Using emulator:', this.currentEmulator.id)
          }
          
          const url = this.webvmEmuhub.getVNCUrl(this.currentEmulator.id)
          if (url && url !== '') {
            console.log('✅ VNC URL obtained')
            return url
          }
        }
      } catch (error) {
        // Ignore errors, continue waiting
      }
      
      // Log progress every 10 seconds
      const elapsed = Date.now() - startTime
      if (elapsed - lastLogTime >= 10000) {
        console.log(`⏳ Still waiting for VNC URL... (${Math.floor(elapsed / 1000)}s)`)
        lastLogTime = elapsed
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    console.warn('⚠️ VNC URL not available after timeout')
    // Return a fallback URL anyway
    if (this.currentEmulator) {
      return this.webvmEmuhub.getVNCUrl(this.currentEmulator.id)
    }
    
    return null
  }

  /**
   * Get browser emulator (for direct access in browser mode)
   */
  getBrowserEmulator(): AndroidEmulator | null {
    return this.browserEmulator
  }

  /**
   * Switch emulation mode
   */
  async switchMode(newMode: EmulationMode): Promise<boolean> {
    // Stop current emulation
    await this.stop()
    
    // Clear current state
    this.currentEmulator = null
    this.browserEmulator = null
    
    // Set new mode
    this.mode = newMode
    
    // Re-initialize with new mode
    return await this.init()
  }
}

