/**
 * Status Tracker
 * 
 * Tracks and reports real-time status of emulator initialization and operations
 */

export type StatusType = 'info' | 'success' | 'warning' | 'error' | 'progress'

export interface StatusUpdate {
  id: string
  type: StatusType
  message: string
  progress?: number // 0-100
  timestamp: number
  details?: string
}

export type StatusCallback = (update: StatusUpdate) => void

export class StatusTracker {
  private static instance: StatusTracker | null = null
  private callbacks: Set<StatusCallback> = new Set()
  private statusHistory: StatusUpdate[] = []
  private maxHistorySize: number = 100
  private currentStatus: StatusUpdate | null = null

  private constructor() {}

  static getInstance(): StatusTracker {
    if (!StatusTracker.instance) {
      StatusTracker.instance = new StatusTracker()
    }
    return StatusTracker.instance
  }

  /**
   * Subscribe to status updates
   */
  subscribe(callback: StatusCallback): () => void {
    this.callbacks.add(callback)
    
    // Send current status if available
    if (this.currentStatus) {
      callback(this.currentStatus)
    }

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback)
    }
  }

  /**
   * Report a status update
   */
  report(type: StatusType, message: string, progress?: number, details?: string): void {
    const update: StatusUpdate = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      progress,
      timestamp: Date.now(),
      details,
    }

    this.currentStatus = update
    this.statusHistory.push(update)

    // Limit history size
    if (this.statusHistory.length > this.maxHistorySize) {
      this.statusHistory.shift()
    }

    // Notify all subscribers
    for (const callback of this.callbacks) {
      try {
        callback(update)
      } catch (error) {
        console.error('Status callback error:', error)
      }
    }
  }

  /**
   * Report info status
   */
  info(message: string, details?: string): void {
    this.report('info', message, undefined, details)
  }

  /**
   * Report success status
   */
  success(message: string, details?: string): void {
    this.report('success', message, undefined, details)
  }

  /**
   * Report warning status
   */
  warning(message: string, details?: string): void {
    this.report('warning', message, undefined, details)
  }

  /**
   * Report error status
   */
  error(message: string, details?: string): void {
    this.report('error', message, undefined, details)
  }

  /**
   * Report progress status
   */
  progress(message: string, progress: number, details?: string): void {
    this.report('progress', message, progress, details)
  }

  /**
   * Get current status
   */
  getCurrentStatus(): StatusUpdate | null {
    return this.currentStatus
  }

  /**
   * Get status history
   */
  getHistory(): StatusUpdate[] {
    return [...this.statusHistory]
  }

  /**
   * Clear status history
   */
  clear(): void {
    this.statusHistory = []
    this.currentStatus = null
  }
}

export const statusTracker = StatusTracker.getInstance()

