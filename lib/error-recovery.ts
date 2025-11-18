/**
 * Error Recovery System
 * 
 * Inspired by rvemu's robust error handling.
 * Provides automatic recovery and graceful degradation.
 */

export interface RecoveryStrategy {
  name: string
  priority: number
  handler: () => Promise<boolean>
}

export interface ErrorContext {
  error: Error
  component: string
  timestamp: number
  retryCount: number
}

export class ErrorRecovery {
  private static strategies: Map<string, RecoveryStrategy[]> = new Map()
  private static errorHistory: ErrorContext[] = []
  private static maxHistorySize: number = 100

  /**
   * Register recovery strategy for a component
   */
  static registerStrategy(
    component: string,
    strategy: RecoveryStrategy
  ): void {
    const strategies = this.strategies.get(component) || []
    strategies.push(strategy)
    // Sort by priority (higher first)
    strategies.sort((a, b) => b.priority - a.priority)
    this.strategies.set(component, strategies)
  }

  /**
   * Attempt recovery for an error
   */
  static async recover(
    error: Error,
    component: string
  ): Promise<boolean> {
    // Log error
    this.logError(error, component)

    // Get recovery strategies
    const strategies = this.strategies.get(component) || []
    if (strategies.length === 0) {
      console.warn(`No recovery strategies for component: ${component}`)
      return false
    }

    // Try strategies in order of priority
    for (const strategy of strategies) {
      try {
        console.log(`🔄 Attempting recovery: ${strategy.name} for ${component}`)
        const recovered = await strategy.handler()
        if (recovered) {
          console.log(`✅ Recovery successful: ${strategy.name}`)
          return true
        }
      } catch (recoveryError) {
        console.warn(`⚠️ Recovery strategy ${strategy.name} failed:`, recoveryError)
        // Continue to next strategy
      }
    }

    console.error(`❌ All recovery strategies failed for ${component}`)
    return false
  }

  /**
   * Log error for analysis
   */
  private static logError(error: Error, component: string): void {
    const context: ErrorContext = {
      error,
      component,
      timestamp: Date.now(),
      retryCount: this.getRetryCount(component),
    }

    this.errorHistory.push(context)

    // Limit history size
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift()
    }

    // Log to console with context
    console.error(`[${component}] Error:`, error.message, {
      stack: error.stack,
      retryCount: context.retryCount,
    })
  }

  /**
   * Get retry count for component
   */
  private static getRetryCount(component: string): number {
    return this.errorHistory.filter(
      ctx => ctx.component === component
    ).length
  }

  /**
   * Check if component has too many errors
   */
  static hasTooManyErrors(component: string, threshold: number = 5): boolean {
    const recentErrors = this.errorHistory.filter(
      ctx =>
        ctx.component === component &&
        Date.now() - ctx.timestamp < 60000 // Last minute
    )
    return recentErrors.length >= threshold
  }

  /**
   * Get error statistics
   */
  static getErrorStats(): Record<string, { count: number; lastError: number }> {
    const stats: Record<string, { count: number; lastError: number }> = {}

    for (const context of this.errorHistory) {
      if (!stats[context.component]) {
        stats[context.component] = {
          count: 0,
          lastError: 0,
        }
      }
      stats[context.component].count++
      stats[context.component].lastError = Math.max(
        stats[context.component].lastError,
        context.timestamp
      )
    }

    return stats
  }

  /**
   * Clear error history
   */
  static clearHistory(component?: string): void {
    if (component) {
      this.errorHistory = this.errorHistory.filter(
        ctx => ctx.component !== component
      )
    } else {
      this.errorHistory = []
    }
  }

  /**
   * Wrap function with automatic recovery
   */
  static withRecovery<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    component: string,
    fallback?: (...args: Parameters<T>) => Promise<ReturnType<T>>
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args)
      } catch (error) {
        const recovered = await this.recover(
          error instanceof Error ? error : new Error(String(error)),
          component
        )

        if (recovered) {
          // Retry after recovery
          try {
            return await fn(...args)
          } catch (retryError) {
            // Recovery didn't help, use fallback
            if (fallback) {
              return await fallback(...args)
            }
            throw retryError
          }
        } else if (fallback) {
          // No recovery, use fallback
          return await fallback(...args)
        } else {
          throw error
        }
      }
    }) as T
  }
}

/**
 * Register default recovery strategies
 */
export function registerDefaultRecoveryStrategies(): void {
  // Emulator recovery strategies
  ErrorRecovery.registerStrategy('emulator', {
    name: 'restart-emulator',
    priority: 10,
    handler: async () => {
      // Try to restart emulator
      console.log('🔄 Attempting to restart emulator...')
      // Implementation would go here
      return false
    },
  })

  ErrorRecovery.registerStrategy('emulator', {
    name: 'fallback-to-browser',
    priority: 5,
    handler: async () => {
      // Fallback to browser emulation
      console.log('🔄 Falling back to browser emulation...')
      // Implementation would go here
      return false
    },
  })

  // Network recovery strategies
  ErrorRecovery.registerStrategy('network', {
    name: 'retry-request',
    priority: 10,
    handler: async () => {
      // Retry network request
      await new Promise(resolve => setTimeout(resolve, 1000))
      return true
    },
  })

  // WebAssembly recovery strategies
  ErrorRecovery.registerStrategy('wasm', {
    name: 'reload-wasm',
    priority: 10,
    handler: async () => {
      // Reload WebAssembly module
      console.log('🔄 Reloading WebAssembly module...')
      // Implementation would go here
      return false
    },
  })
}

