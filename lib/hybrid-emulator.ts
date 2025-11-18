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
import { EmuHubEmulator } from './emuhub-integration'

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
    console.log('Initializing Hybrid Emulator, mode:', this.mode)

    // Auto-detect best mode
    if (this.mode === 'auto') {
      this.mode = await this.detectBestMode()
      console.log('Auto-selected mode:', this.mode)
    }

    switch (this.mode) {
      case 'webvm-emuhub':
        return await this.initWebVMEmuHub()
      case 'browser':
      default:
        return await this.initBrowser()
    }
  }

  /**
   * Detect the best available emulation mode
   */
  private async detectBestMode(): Promise<EmulationMode> {
    // Try WebVM + EmuHub combined (best option)
    const webvmEmuhubAvailable = await this.webvmEmuhub.init()
    if (webvmEmuhubAvailable) {
      return 'webvm-emuhub'
    }

    // Fall back to browser (always available)
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
    const initialized = await this.webvmEmuhub.init()
    if (!initialized) {
      console.warn('WebVM + EmuHub not available, falling back to browser emulation')
      return await this.initBrowser()
    }

    // Get or create an emulator
    const emulators = await this.webvmEmuhub.getEmulators()
    if (emulators.length > 0) {
      this.currentEmulator = emulators[0]
    } else {
      // Create a new emulator
      this.currentEmulator = await this.webvmEmuhub.createEmulator()
    }

    if (this.currentEmulator) {
      console.log('WebVM + EmuHub emulation initialized:', this.currentEmulator.id)
      return true
    }

    return false
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
        }
        break
      case 'webvm-emuhub':
        if (this.currentEmulator) {
          await this.webvmEmuhub.installAPK(this.currentEmulator.id, apkData, fileName)
        }
        break
    }
  }

  /**
   * Get the current emulation mode
   */
  getMode(): EmulationMode {
    return this.mode
  }

  /**
   * Get VNC URL (for WebVM + EmuHub mode)
   */
  getVNCUrl(): string | null {
    if (this.mode === 'webvm-emuhub' && this.currentEmulator) {
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

