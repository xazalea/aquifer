/**
 * ARM Emulator - Executes ARM native code via WebAssembly
 * 
 * Integrates Unicorn Engine and arm-js for ARM native library execution
 * Uses Unicorn Engine (https://github.com/unicorn-engine/unicorn) when available
 * Falls back to JavaScript-based ARM emulation (arm-js)
 */

import { UnicornIntegration } from './unicorn-integration'
import { ARMJSFallback } from './arm-js-fallback'

export class ARMEmulator {
  private unicorn: UnicornIntegration
  private armjs: ARMJSFallback
  private isInitialized: boolean = false
  private usingUnicorn: boolean = false

  constructor() {
    this.unicorn = new UnicornIntegration()
    this.armjs = new ARMJSFallback()
  }

  /**
   * Initialize ARM emulator
   */
  async init(): Promise<void> {
    console.log('Initializing ARM emulator...')
    
    // Try to initialize Unicorn Engine first
    const unicornAvailable = await this.unicorn.init()
    
    if (unicornAvailable) {
      console.log('Using Unicorn Engine for ARM emulation (WASM)')
      this.usingUnicorn = true
      this.isInitialized = true
    } else {
      // Fallback to arm-js
      console.log('Unicorn Engine not available, using arm-js JavaScript fallback')
      const armjsAvailable = await this.armjs.init()
      if (armjsAvailable) {
        this.usingUnicorn = false
        this.isInitialized = true
        console.log('arm-js fallback initialized')
      } else {
        console.warn('Both Unicorn and arm-js failed to initialize')
        this.isInitialized = false
      }
    }
  }

  /**
   * Load native library (.so file)
   */
  async loadLibrary(libraryData: ArrayBuffer, name: string): Promise<number> {
    if (!this.isInitialized) {
      await this.init()
    }

    if (this.usingUnicorn && this.unicorn.isAvailable()) {
      return await this.unicorn.loadLibrary(libraryData, name)
    } else if (!this.usingUnicorn && this.armjs.isAvailable()) {
      return await this.armjs.loadLibrary(libraryData, name)
    } else {
      throw new Error('ARM emulator not available')
    }
  }

  /**
   * Execute native function
   */
  async callNativeFunction(address: number, args: number[]): Promise<number> {
    if (!this.isInitialized) {
      await this.init()
    }

    if (this.usingUnicorn && this.unicorn.isAvailable()) {
      return await this.unicorn.callNativeFunction(address, args)
    } else if (!this.usingUnicorn && this.armjs.isAvailable()) {
      return await this.armjs.callNativeFunction(address, args)
    } else {
      throw new Error('ARM emulator not available')
    }
  }

  /**
   * Check if ARM emulator is available
   */
  isAvailable(): boolean {
    if (this.usingUnicorn) {
      return this.isInitialized && this.unicorn.isAvailable()
    } else {
      return this.isInitialized && this.armjs.isAvailable()
    }
  }

  /**
   * Get which emulator is being used
   */
  getEmulatorType(): 'unicorn' | 'armjs' | 'none' {
    if (this.usingUnicorn && this.unicorn.isAvailable()) {
      return 'unicorn'
    } else if (!this.usingUnicorn && this.armjs.isAvailable()) {
      return 'armjs'
    }
    return 'none'
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.usingUnicorn) {
      this.unicorn.cleanup()
    } else {
      this.armjs.cleanup()
    }
    this.isInitialized = false
  }
}

