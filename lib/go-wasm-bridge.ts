/**
 * Professional Go WebAssembly Bridge
 * 
 * Provides TypeScript interface to the Go VM Orchestrator.
 * Handles concurrent execution, thread management, and system services.
 */

export interface GoVMOrchestrator {
  initialize(emulatorPtr: any): boolean;
  start(): boolean;
  stop(): boolean;
  createThread(startPC: number): number;
  getStats(): GoVMStats;
  getThreadCount(): number;
  isRunning(): boolean;
}

export interface GoVMStats {
  instructionsExecuted: number;
  memoryAllocated: number;
  threadsCreated: number;
  threadsTerminated: number;
  executionTime: number;
  activeThreads: number;
}

export class GoWASMBridge {
  private goModule: any = null;
  private orchestrator: GoVMOrchestrator | null = null;
  private initialized: boolean = false;
  private loadPromise: Promise<void> | null = null;

  /**
   * Initialize the Go WebAssembly module
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
      // Go WASM can only be loaded in the browser
      if (typeof window === 'undefined') {
        throw new Error('Go WASM module can only be loaded in browser');
      }

      // Load Go WASM support via script tag (can't use import for public files)
      const wasmExecScript = document.createElement('script');
      wasmExecScript.src = '/wasm/wasm_exec.js';
      wasmExecScript.async = true;
      
      await new Promise<void>((resolve, reject) => {
        wasmExecScript.onload = () => resolve();
        wasmExecScript.onerror = () => reject(new Error('Failed to load wasm_exec.js'));
        document.head.appendChild(wasmExecScript);
      });

      // Load Go WASM module - use public path
      const wasmModule = await fetch('/wasm/vm-orchestrator.wasm');
      const wasmBytes = await wasmModule.arrayBuffer();

      // Initialize Go runtime
      const go = new (window as any).Go();
      const result = await WebAssembly.instantiate(wasmBytes, go.importObject);
      go.run(result.instance);

      // Get orchestrator from global scope
      if (typeof (window as any).createVMOrchestrator === 'function') {
        this.orchestrator = (window as any).createVMOrchestrator() as GoVMOrchestrator;
        this.initialized = true;
        console.log('[Go WASM] VM Orchestrator initialized successfully');
      } else {
        throw new Error('createVMOrchestrator not found in Go module');
      }
    } catch (error) {
      // Don't throw - Go orchestrator is optional
      console.warn('[Go WASM] Failed to initialize VM orchestrator (optional component):', error);
      this.initialized = false;
      this.orchestrator = null;
      // Don't throw - allow graceful fallback
    }
  }

  /**
   * Check if orchestrator is ready
   */
  isReady(): boolean {
    return this.initialized && this.orchestrator !== null;
  }

  /**
   * Initialize with C++ emulator pointer
   */
  initialize(emulatorPtr: any): boolean {
    this._ensureReady();
    return this.orchestrator!.initialize(emulatorPtr);
  }

  /**
   * Start VM execution
   */
  start(): boolean {
    this._ensureReady();
    return this.orchestrator!.start();
  }

  /**
   * Stop VM execution
   */
  stop(): boolean {
    this._ensureReady();
    return this.orchestrator!.stop();
  }

  /**
   * Create a new execution thread
   */
  createThread(startPC: number): number {
    this._ensureReady();
    return this.orchestrator!.createThread(startPC);
  }

  /**
   * Get execution statistics
   */
  getStats(): GoVMStats {
    this._ensureReady();
    return this.orchestrator!.getStats();
  }

  /**
   * Get thread count
   */
  getThreadCount(): number {
    this._ensureReady();
    return this.orchestrator!.getThreadCount();
  }

  /**
   * Check if VM is running
   */
  isRunning(): boolean {
    this._ensureReady();
    return this.orchestrator!.isRunning();
  }

  /**
   * Ensure orchestrator is ready
   */
  private _ensureReady(): void {
    if (!this.initialized || !this.orchestrator) {
      throw new Error('Go WASM orchestrator not initialized. Call init() first.');
    }
  }
}

// Singleton instance
let goWASMInstance: GoWASMBridge | null = null;

/**
 * Get or create the singleton Go WASM instance
 */
export function getGoWASMOrchestrator(): GoWASMBridge {
  if (!goWASMInstance) {
    goWASMInstance = new GoWASMBridge();
  }
  return goWASMInstance;
}

