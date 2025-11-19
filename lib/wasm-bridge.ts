/**
 * Professional WebAssembly Bridge for ARM Emulator
 * 
 * Provides a clean TypeScript interface to the C++ WebAssembly emulator module.
 * Handles memory management, type safety, and error handling.
 */

export interface WASMEmulatorModule {
  createEmulator(): number;
  initEmulator(ptr: number, size: number): number;
  writeMemory(ptr: number, address: number, dataPtr: number, length: number): number;
  readMemory(ptr: number, address: number, outputPtr: number, length: number): number;
  setRegister(ptr: number, reg: number, value: number): void;
  getRegister(ptr: number, reg: number): number;
  executeInstruction(ptr: number, instruction: number): number;
  executeInstructions(ptr: number, instructionsPtr: number, count: number): number;
  getInstructionCount(ptr: number): bigint;
  getMemorySize(ptr: number): number;
  getPC(ptr: number): number;
  setPC(ptr: number, value: number): void;
  destroyEmulator(ptr: number): void;
  _malloc(size: number): number;
  _free(ptr: number): void;
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
}

export interface WASMEmulatorStats {
  instructionCount: number;
  memorySize: number;
  pc: number;
}

/**
 * High-level TypeScript interface for the WASM ARM emulator
 */
export class WASMEmulatorBridge {
  private module: WASMEmulatorModule | null = null;
  private emulatorPtr: number | null = null;
  private initialized: boolean = false;
  private loadPromise: Promise<void> | null = null;

  /**
   * Initialize the WebAssembly module
   * Can be called multiple times safely (returns cached promise if already loading)
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._doInit();
    return this.loadPromise;
  }

  private async _doInit(): Promise<void> {
    try {
      // WASM modules can only be loaded in the browser
      if (typeof window === 'undefined') {
        throw new Error('WASM module can only be loaded in browser');
      }

      // Check if WASM files exist and are valid JavaScript before trying to load
      try {
        const response = await fetch('/wasm/emulator.js');
        if (!response.ok) {
          throw new Error('WASM module files not found');
        }
        const contentType = response.headers.get('content-type') || '';
        // Check if we got HTML (404 page) instead of JavaScript
        if (contentType.includes('text/html')) {
          throw new Error('WASM module files not found (404)');
        }
        // Check first few bytes to ensure it's not HTML
        const text = await response.text();
        if (text.trim().startsWith('<!')) {
          throw new Error('WASM module files not found (404 HTML page)');
        }
      } catch (error) {
        // File doesn't exist or is invalid, skip WASM loading
        throw error instanceof Error ? error : new Error('WASM module files not found');
      }

      // Load JavaScript loader dynamically at runtime
      // Use a script tag approach for Emscripten-generated modules
      const script = document.createElement('script');
      script.src = '/wasm/emulator.js';
      script.async = true;
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WASM module load timeout'));
        }, 10000); // 10 second timeout

        script.onload = () => {
          clearTimeout(timeout);
          try {
            // Emscripten modules expose themselves globally
            const moduleFactory = (window as any).createWASMEmulator;
            if (!moduleFactory) {
              reject(new Error('WASM module factory not found'));
              return;
            }
            
            // Initialize module with WASM file path
            moduleFactory({
              locateFile: (path: string) => {
                if (path.endsWith('.wasm')) {
                  return '/wasm/emulator.wasm';
                }
                return path;
              }
            }).then((module: WASMEmulatorModule) => {
              this.module = module;
              resolve();
            }).catch((err: Error) => {
              reject(new Error(`Failed to initialize WASM module: ${err.message}`));
            });
          } catch (err) {
            clearTimeout(timeout);
            reject(new Error(`Error loading WASM module: ${err instanceof Error ? err.message : 'Unknown error'}`));
          }
        };
        
        script.onerror = (event) => {
          clearTimeout(timeout);
          // Check if we got an HTML page (404) instead of JS
          fetch('/wasm/emulator.js')
            .then(res => res.text())
            .then(text => {
              if (text.trim().startsWith('<!')) {
                reject(new Error('WASM module file not found (404)'));
              } else {
                reject(new Error('Failed to load WASM module script'));
              }
            })
            .catch(() => {
              reject(new Error('Failed to load WASM module script'));
            });
        };
        
        document.head.appendChild(script);
      });
      
      if (!this.module) {
        throw new Error('Failed to create WASM module');
      }

      // Create emulator instance
      this.emulatorPtr = this.module.createEmulator();
      
      if (!this.emulatorPtr) {
        throw new Error('Failed to create emulator instance');
      }

      // Initialize with 64MB memory
      const initResult = this.module.initEmulator(this.emulatorPtr, 64 * 1024 * 1024);
      if (!initResult) {
        throw new Error('Failed to initialize emulator memory');
      }

      this.initialized = true;
      console.log('[WASM] ARM Emulator initialized successfully');
    } catch (error) {
      // Don't throw - allow graceful fallback to other emulators
      console.warn('[WASM] Failed to initialize ARM emulator (will use fallback):', error);
      this.initialized = false;
      this.emulatorPtr = null;
      this.module = null;
      // Don't throw - let the caller handle fallback
    }
  }

  /**
   * Check if the emulator is initialized
   */
  isReady(): boolean {
    return this.initialized && this.module !== null && this.emulatorPtr !== null;
  }

  /**
   * Write data to emulator memory
   */
  writeMemory(address: number, data: Uint8Array): void {
    this._ensureReady();

    const dataPtr = this.module!._malloc(data.length);
    if (!dataPtr) {
      throw new Error('Failed to allocate memory for write operation');
    }

    try {
      this.module!.HEAPU8.set(data, dataPtr);
      const result = this.module!.writeMemory(this.emulatorPtr!, address, dataPtr, data.length);
      if (!result) {
        throw new Error(`Failed to write memory at address 0x${address.toString(16)}`);
      }
    } finally {
      this.module!._free(dataPtr);
    }
  }

  /**
   * Read data from emulator memory
   */
  readMemory(address: number, length: number): Uint8Array {
    this._ensureReady();

    const outputPtr = this.module!._malloc(length);
    if (!outputPtr) {
      throw new Error('Failed to allocate memory for read operation');
    }

    try {
      const result = this.module!.readMemory(this.emulatorPtr!, address, outputPtr, length);
      if (!result) {
        throw new Error(`Failed to read memory at address 0x${address.toString(16)}`);
      }

      // Copy data to avoid issues with WASM memory
      const resultData = this.module!.HEAPU8.subarray(outputPtr, outputPtr + length);
      return new Uint8Array(resultData);
    } finally {
      this.module!._free(outputPtr);
    }
  }

  /**
   * Set a register value
   */
  setRegister(reg: number, value: number): void {
    this._ensureReady();
    
    if (reg > 16) {
      throw new Error(`Invalid register number: ${reg} (must be 0-16)`);
    }
    
    this.module!.setRegister(this.emulatorPtr!, reg, value);
  }

  /**
   * Get a register value
   */
  getRegister(reg: number): number {
    this._ensureReady();
    
    if (reg > 16) {
      throw new Error(`Invalid register number: ${reg} (must be 0-16)`);
    }
    
    return this.module!.getRegister(this.emulatorPtr!, reg);
  }

  /**
   * Execute a single ARM instruction
   */
  executeInstruction(instruction: number): boolean {
    this._ensureReady();
    return this.module!.executeInstruction(this.emulatorPtr!, instruction) !== 0;
  }

  /**
   * Execute multiple ARM instructions
   * Returns the number of instructions successfully executed
   */
  executeInstructions(instructions: Uint32Array): number {
    this._ensureReady();

    const instructionsPtr = this.module!._malloc(instructions.length * 4);
    if (!instructionsPtr) {
      throw new Error('Failed to allocate memory for instructions');
    }

    try {
      // Write instructions to WASM memory
      this.module!.HEAPU32.set(instructions, instructionsPtr / 4);
      
      // Execute instructions
      const executed = this.module!.executeInstructions(
        this.emulatorPtr!,
        instructionsPtr,
        instructions.length
      );
      
      return executed;
    } finally {
      this.module!._free(instructionsPtr);
    }
  }

  /**
   * Get execution statistics
   */
  getStats(): WASMEmulatorStats {
    this._ensureReady();
    
    return {
      instructionCount: Number(this.module!.getInstructionCount(this.emulatorPtr!)),
      memorySize: this.module!.getMemorySize(this.emulatorPtr!),
      pc: this.module!.getPC(this.emulatorPtr!),
    };
  }

  /**
   * Get program counter
   */
  getPC(): number {
    this._ensureReady();
    return this.module!.getPC(this.emulatorPtr!);
  }

  /**
   * Set program counter
   */
  setPC(value: number): void {
    this._ensureReady();
    this.module!.setPC(this.emulatorPtr!, value);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.module && this.emulatorPtr) {
      this.module.destroyEmulator(this.emulatorPtr);
      this.emulatorPtr = null;
    }
    this.initialized = false;
    this.module = null;
    this.loadPromise = null;
  }

  /**
   * Ensure emulator is ready, throw error if not
   */
  private _ensureReady(): void {
    if (!this.initialized || !this.module || !this.emulatorPtr) {
      throw new Error('WASM emulator not initialized. Call init() first.');
    }
  }
}

// Singleton instance for easy access
let wasmEmulatorInstance: WASMEmulatorBridge | null = null;

/**
 * Get or create the singleton WASM emulator instance
 */
export function getWASMEmulator(): WASMEmulatorBridge {
  if (!wasmEmulatorInstance) {
    wasmEmulatorInstance = new WASMEmulatorBridge();
  }
  return wasmEmulatorInstance;
}

