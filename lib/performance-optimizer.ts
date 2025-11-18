/**
 * Performance Optimizer
 * 
 * Inspired by rvemu's efficient WebAssembly and Rust patterns.
 * Provides caching, resource pooling, and performance monitoring.
 */

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer | null = null
  private resourcePool: Map<string, any[]> = new Map()
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()
  private performanceMetrics: Map<string, number[]> = new Map()
  private maxPoolSize: number = 10
  private cacheCleanupInterval: number = 60000 // 1 minute

  private constructor() {
    // Start cache cleanup
    setInterval(() => this.cleanupCache(), this.cacheCleanupInterval)
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer()
    }
    return PerformanceOptimizer.instance
  }

  /**
   * Resource Pooling - Reuse resources instead of creating new ones
   * Inspired by rvemu's efficient resource management
   */
  acquire<T>(resourceType: string, factory: () => T): T {
    const pool = this.resourcePool.get(resourceType) || []
    
    if (pool.length > 0) {
      const resource = pool.pop()
      // Reset resource state if needed
      if (resource && typeof resource.reset === 'function') {
        resource.reset()
      }
      return resource as T
    }
    
    // Create new resource if pool is empty
    return factory()
  }

  release<T>(resourceType: string, resource: T): void {
    const pool = this.resourcePool.get(resourceType) || []
    
    if (pool.length < this.maxPoolSize) {
      // Clean up resource before returning to pool
      if (resource && typeof (resource as any).cleanup === 'function') {
        (resource as any).cleanup()
      }
      pool.push(resource)
      this.resourcePool.set(resourceType, pool)
    } else {
      // Pool is full, dispose resource
      if (resource && typeof (resource as any).dispose === 'function') {
        (resource as any).dispose()
      }
    }
  }

  /**
   * Intelligent Caching with TTL
   * Reduces redundant operations and improves response times
   */
  cacheSet<T>(key: string, data: T, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  cacheGet<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    if (age > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  cacheInvalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Performance Monitoring
   * Track execution times for optimization
   */
  startTiming(label: string): () => void {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      const timings = this.performanceMetrics.get(label) || []
      timings.push(duration)
      
      // Keep only last 100 measurements
      if (timings.length > 100) {
        timings.shift()
      }
      
      this.performanceMetrics.set(label, timings)
    }
  }

  getAverageTime(label: string): number {
    const timings = this.performanceMetrics.get(label)
    if (!timings || timings.length === 0) return 0
    
    const sum = timings.reduce((a, b) => a + b, 0)
    return sum / timings.length
  }

  getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {}
    
    for (const [label, timings] of this.performanceMetrics.entries()) {
      if (timings.length === 0) continue
      
      result[label] = {
        avg: timings.reduce((a, b) => a + b, 0) / timings.length,
        min: Math.min(...timings),
        max: Math.max(...timings),
        count: timings.length,
      }
    }
    
    return result
  }

  /**
   * Memory-efficient cleanup
   */
  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp
      if (age > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Batch operations for better performance
   * Inspired by rvemu's efficient batch processing
   */
  async batchProcess<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 10
  ): Promise<R[]> {
    const results: R[] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(processor))
      results.push(...batchResults)
      
      // Yield to browser for smooth rendering
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    
    return results
  }

  /**
   * Debounce function calls for performance
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null
    
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  /**
   * Throttle function calls
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => {
          inThrottle = false
        }, limit)
      }
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.cache.clear()
    this.resourcePool.clear()
    this.performanceMetrics.clear()
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance()

