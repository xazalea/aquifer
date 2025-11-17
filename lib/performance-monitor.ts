/**
 * Performance Monitor - Monitor VM performance metrics
 * Inspired by Vectras-VM-Android performance optimizations
 */

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  cpuUsage: number
  renderTime: number
}

export class PerformanceMonitor {
  private frameCount: number = 0
  private lastFPSUpdate: number = 0
  private frameTimes: number[] = []
  private currentFPS: number = 0
  private maxFrameTimeHistory: number = 60 // Keep last 60 frames

  /**
   * Record a frame render
   */
  recordFrame(renderTime: number): void {
    const now = performance.now()
    this.frameTimes.push(renderTime)
    
    if (this.frameTimes.length > this.maxFrameTimeHistory) {
      this.frameTimes.shift()
    }

    this.frameCount++
    
    // Update FPS every second
    if (now - this.lastFPSUpdate >= 1000) {
      this.currentFPS = this.frameCount
      this.frameCount = 0
      this.lastFPSUpdate = now
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const avgFrameTime = this.frameTimes.length > 0
      ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      : 0

    return {
      fps: this.currentFPS,
      frameTime: avgFrameTime,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: 0, // Browser doesn't expose CPU usage directly
      renderTime: this.frameTimes[this.frameTimes.length - 1] || 0,
    }
  }

  /**
   * Get memory usage (if available)
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const mem = (performance as any).memory
      return mem.usedJSHeapSize / mem.jsHeapSizeLimit
    }
    return 0
  }

  /**
   * Check if performance is degraded
   */
  isPerformanceDegraded(): boolean {
    const metrics = this.getMetrics()
    return metrics.fps < 20 || metrics.frameTime > 50 // Less than 20 FPS or frame time > 50ms
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = []
    const metrics = this.getMetrics()

    if (metrics.fps < 20) {
      recommendations.push('Low FPS detected. Consider closing other browser tabs.')
    }

    if (metrics.frameTime > 50) {
      recommendations.push('High frame time. The VM may be struggling with the current workload.')
    }

    if (metrics.memoryUsage > 0.8) {
      recommendations.push('High memory usage. Consider restarting the VM.')
    }

    return recommendations
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.frameCount = 0
    this.lastFPSUpdate = performance.now()
    this.frameTimes = []
    this.currentFPS = 0
  }
}

