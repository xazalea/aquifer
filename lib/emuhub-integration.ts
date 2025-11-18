/**
 * EmuHub Integration - Docker-based Android Emulation
 * 
 * Integrates EmuHub (https://github.com/mohamed-helmy/emuhub) for Docker-based
 * Android emulation via NoVNC. This provides a more complete Android environment
 * compared to browser-based emulation.
 * 
 * EmuHub uses Docker containers with Android emulators accessible via web browser
 * through NoVNC (HTML5-based VNC client).
 */

export interface EmuHubConfig {
  serverUrl: string
  vncPassword: string
  emuhubPassword: string
  listenPort: number
}

export interface EmuHubEmulator {
  id: string
  name: string
  status: 'running' | 'stopped' | 'starting'
  vncUrl: string
  androidVersion: string
}

export class EmuHubIntegration {
  private config: EmuHubConfig
  private emulators: Map<string, EmuHubEmulator> = new Map()
  private isConnected: boolean = false

  constructor(config?: Partial<EmuHubConfig>) {
    this.config = {
      serverUrl: config?.serverUrl || 'http://localhost:8000',
      vncPassword: config?.vncPassword || 'admin',
      emuhubPassword: config?.emuhubPassword || 'admin',
      listenPort: config?.listenPort || 8000,
    }
  }

  /**
   * Connect to EmuHub server
   */
  async connect(): Promise<boolean> {
    try {
      // Check if EmuHub server is available with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)
      
      try {
        const response = await fetch(`${this.config.serverUrl}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        
        if (response.ok) {
          this.isConnected = true
          await this.refreshEmulators()
          return true
        } else {
          return false
        }
      } catch (fetchError) {
        clearTimeout(timeoutId)
        // Connection refused or timeout - EmuHub not available
        // Silently return false - browser emulation will be used
        return false
      }
    } catch (error) {
      // Silently fail - browser emulation will be used
      return false
    }
  }

  /**
   * Refresh list of available emulators
   */
  async refreshEmulators(): Promise<EmuHubEmulator[]> {
    if (!this.isConnected) {
      return []
    }

    try {
      // In a real implementation, this would call EmuHub API
      // For now, we'll simulate it
      const response = await fetch(`${this.config.serverUrl}/api/emulators`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const data = await response.json()
        const emulators = data.emulators || []
        
        emulators.forEach((emu: any) => {
          this.emulators.set(emu.id, {
            id: emu.id,
            name: emu.name,
            status: emu.status,
            vncUrl: `${this.config.serverUrl}/vnc/${emu.id}`,
            androidVersion: emu.androidVersion || 'Unknown',
          })
        })

        return Array.from(this.emulators.values())
      }
    } catch (error) {
      console.warn('Failed to refresh emulators:', error)
    }

    return []
  }

  /**
   * Get available emulators
   */
  getEmulators(): EmuHubEmulator[] {
    return Array.from(this.emulators.values())
  }

  /**
   * Create a new emulator instance
   */
  async createEmulator(config?: {
    androidVersion?: string
    deviceName?: string
    screenResolution?: string
  }): Promise<EmuHubEmulator | null> {
    if (!this.isConnected) {
      return null
    }

    try {
      const response = await fetch(`${this.config.serverUrl}/api/emulators/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          androidVersion: config?.androidVersion || '11',
          deviceName: config?.deviceName || 'Pixel_5',
          screenResolution: config?.screenResolution || '1080x1920',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const emulator: EmuHubEmulator = {
          id: data.id,
          name: data.name,
          status: 'starting',
          vncUrl: `${this.config.serverUrl}/vnc/${data.id}`,
          androidVersion: data.androidVersion,
        }

        this.emulators.set(emulator.id, emulator)
        return emulator
      }
    } catch (error) {
      console.error('Failed to create emulator:', error)
    }

    return null
  }

  /**
   * Install APK on an emulator
   */
  async installAPK(emulatorId: string, apkData: ArrayBuffer, fileName: string): Promise<boolean> {
    if (!this.isConnected) {
      return false
    }

    try {
      // Convert ArrayBuffer to Blob for upload
      const blob = new Blob([apkData], { type: 'application/vnd.android.package-archive' })
      const formData = new FormData()
      formData.append('apk', blob, fileName)

      const response = await fetch(`${this.config.serverUrl}/api/emulators/${emulatorId}/install`, {
        method: 'POST',
        body: formData,
      })

      return response.ok
    } catch (error) {
      console.error('Failed to install APK:', error)
      return false
    }
  }

  /**
   * Get VNC URL for an emulator (for embedding in iframe)
   */
  getVNCUrl(emulatorId: string): string {
    const emulator = this.emulators.get(emulatorId)
    if (emulator) {
      return `${emulator.vncUrl}?password=${this.config.vncPassword}`
    }
    return ''
  }

  /**
   * Check if EmuHub is available
   */
  isAvailable(): boolean {
    return this.isConnected
  }

  /**
   * Disconnect from EmuHub
   */
  disconnect(): void {
    this.isConnected = false
    this.emulators.clear()
  }
}

