/**
 * Game Crash Recovery
 * 
 * Handles game crashes gracefully:
 * - Automatic state saving
 * - Crash detection
 * - State restoration
 * - Error reporting
 */

export interface GameState {
  timestamp: number
  data: any
  checksum?: string
}

// Type guard for GameState
function isGameState(obj: any): obj is GameState {
  return obj && typeof obj === 'object' && typeof obj.timestamp === 'number' && obj.data !== undefined
}

export class GameCrashRecovery {
  private static instance: GameCrashRecovery | null = null
  private stateHistory: GameState[] = []
  private maxHistorySize: number = 10
  private autoSaveInterval: number = 30000 // 30 seconds
  private autoSaveTimer: NodeJS.Timeout | null = null
  private crashHandlers: Array<() => void> = []
  private isRecovering: boolean = false

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupCrashDetection()
    }
  }

  static getInstance(): GameCrashRecovery {
    if (!GameCrashRecovery.instance) {
      GameCrashRecovery.instance = new GameCrashRecovery()
    }
    return GameCrashRecovery.instance
  }

  /**
   * Setup crash detection
   */
  private setupCrashDetection(): void {
    // Detect unhandled errors
    window.addEventListener('error', (event) => {
      this.handleCrash('unhandled-error', event.error)
    })

    // Detect unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleCrash('unhandled-rejection', event.reason)
    })

    // Detect WebGL context loss
    // This will be handled by the game renderer
  }

  /**
   * Save game state
   */
  saveState(data: any): void {
    const state: GameState = {
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      checksum: this.calculateChecksum(data),
    }

    this.stateHistory.push(state)

    // Limit history size
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift()
    }

    // Also save to IndexedDB for persistence
    this.saveToIndexedDB(state)
  }

  /**
   * Restore game state
   */
  restoreState(): GameState | null {
    if (this.stateHistory.length === 0) {
      // IndexedDB loading is async, so we can't return it synchronously
      // Return null and let the caller handle async loading if needed
      return null
    }

    // Return most recent state
    return this.stateHistory[this.stateHistory.length - 1]
  }

  /**
   * Enable auto-save
   */
  enableAutoSave(saveFn: () => any): void {
    this.autoSaveTimer = setInterval(() => {
      try {
        const state = saveFn()
        this.saveState(state)
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }, this.autoSaveInterval)
  }

  /**
   * Disable auto-save
   */
  disableAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }

  /**
   * Handle crash
   */
  private handleCrash(type: string, error: any): void {
    if (this.isRecovering) {
      return // Already recovering
    }

    console.error(`Game crash detected: ${type}`, error)

    // Save crash report
    this.saveCrashReport(type, error)

    // Notify handlers
    for (const handler of this.crashHandlers) {
      try {
        handler()
      } catch (handlerError) {
        console.error('Crash handler error:', handlerError)
      }
    }

    // Attempt recovery
    this.attemptRecovery()
  }

  /**
   * Attempt recovery
   */
  private attemptRecovery(): void {
    this.isRecovering = true

    // Restore state
    const state = this.restoreState()
    if (state) {
      console.log('✅ Game state restored')
      // State restoration will be handled by the game
    } else {
      console.warn('⚠️ No saved state available for recovery')
    }

    this.isRecovering = false
  }

  /**
   * Register crash handler
   */
  onCrash(handler: () => void): void {
    this.crashHandlers.push(handler)
  }

  /**
   * Calculate checksum for state validation
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(36)
  }

  /**
   * Save state to IndexedDB
   */
  private async saveToIndexedDB(state: GameState): Promise<void> {
    try {
      const db = await this.openIndexedDB()
      const transaction = db.transaction(['gameStates'], 'readwrite')
      const store = transaction.objectStore('gameStates')
      await store.put(state, 'latest')
      db.close()
    } catch (error) {
      console.warn('Failed to save state to IndexedDB:', error)
    }
  }

  /**
   * Load state from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<GameState | null> {
    try {
      const db = await this.openIndexedDB()
      const transaction = db.transaction(['gameStates'], 'readonly')
      const store = transaction.objectStore('gameStates')
      
      return new Promise<GameState | null>((resolve) => {
        const request = store.get('latest')
        request.onsuccess = () => {
          const state = request.result
          db.close()
          resolve(isGameState(state) ? state : null)
        }
        request.onerror = () => {
          db.close()
          resolve(null)
        }
      })
    } catch (error) {
      console.warn('Failed to load state from IndexedDB:', error)
      return null
    }
  }

  /**
   * Open IndexedDB
   */
  private openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('GameStates', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains('gameStates')) {
          db.createObjectStore('gameStates')
        }
      }
    })
  }

  /**
   * Save crash report
   */
  private saveCrashReport(type: string, error: any): void {
    const report = {
      type,
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    // Save to localStorage for debugging
    try {
      const reports = JSON.parse(localStorage.getItem('crashReports') || '[]')
      reports.push(report)
      // Keep only last 10 reports
      if (reports.length > 10) {
        reports.shift()
      }
      localStorage.setItem('crashReports', JSON.stringify(reports))
    } catch {
      // Ignore localStorage errors
    }

    console.error('Crash report:', report)
  }

  /**
   * Get crash reports
   */
  getCrashReports(): any[] {
    try {
      return JSON.parse(localStorage.getItem('crashReports') || '[]')
    } catch {
      return []
    }
  }

  /**
   * Clear crash reports
   */
  clearCrashReports(): void {
    localStorage.removeItem('crashReports')
  }
}

export const gameCrashRecovery = GameCrashRecovery.getInstance()

