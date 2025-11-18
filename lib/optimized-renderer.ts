/**
 * Optimized Renderer
 * 
 * Inspired by rvemu's efficient rendering pipeline.
 * Provides optimized canvas rendering with dirty regions and frame skipping.
 */

export interface RenderOptions {
  targetFPS?: number
  enableDirtyRegions?: boolean
  enableFrameSkipping?: boolean
  maxFrameSkip?: number
}

export class OptimizedRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private options: Required<RenderOptions>
  private animationFrameId: number | null = null
  private lastFrameTime: number = 0
  private frameSkipCount: number = 0
  private dirtyRegions: Array<{ x: number; y: number; width: number; height: number }> = []
  private isRendering: boolean = false
  private renderQueue: Array<() => void> = []

  constructor(canvas: HTMLCanvasElement, options: RenderOptions = {}) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d', {
      alpha: false, // Disable alpha for better performance
      desynchronized: true, // Allow async rendering
      willReadFrequently: false, // Optimize for write operations
    })
    
    if (!ctx) {
      throw new Error('Failed to get 2D context')
    }
    
    this.ctx = ctx
    this.options = {
      targetFPS: options.targetFPS || 60,
      enableDirtyRegions: options.enableDirtyRegions ?? true,
      enableFrameSkipping: options.enableFrameSkipping ?? true,
      maxFrameSkip: options.maxFrameSkip || 2,
    }

    // Optimize canvas settings
    this.optimizeCanvas()
  }

  /**
   * Optimize canvas for performance
   */
  private optimizeCanvas(): void {
    // Disable image smoothing for pixel-perfect rendering (faster)
    this.ctx.imageSmoothingEnabled = false
    
    // Set optimal rendering hints
    if ('imageSmoothingQuality' in this.ctx) {
      (this.ctx as any).imageSmoothingQuality = 'low'
    }
  }

  /**
   * Mark a region as dirty (needs redraw)
   */
  markDirty(x: number, y: number, width: number, height: number): void {
    if (!this.options.enableDirtyRegions) return

    // Merge overlapping regions
    const newRegion = { x, y, width, height }
    let merged = false

    for (let i = 0; i < this.dirtyRegions.length; i++) {
      const region = this.dirtyRegions[i]
      
      // Check if regions overlap or are adjacent
      if (
        newRegion.x < region.x + region.width &&
        newRegion.x + newRegion.width > region.x &&
        newRegion.y < region.y + region.height &&
        newRegion.y + newRegion.height > region.y
      ) {
        // Merge regions
        const minX = Math.min(region.x, newRegion.x)
        const minY = Math.min(region.y, newRegion.y)
        const maxX = Math.max(region.x + region.width, newRegion.x + newRegion.width)
        const maxY = Math.max(region.y + region.height, newRegion.y + newRegion.height)
        
        this.dirtyRegions[i] = {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        }
        merged = true
        break
      }
    }

    if (!merged) {
      this.dirtyRegions.push(newRegion)
    }

    // Limit dirty regions to prevent memory issues
    if (this.dirtyRegions.length > 100) {
      // Merge all regions into one full-screen update
      this.dirtyRegions = [{
        x: 0,
        y: 0,
        width: this.canvas.width,
        height: this.canvas.height,
      }]
    }
  }

  /**
   * Mark entire canvas as dirty
   */
  markAllDirty(): void {
    this.dirtyRegions = [{
      x: 0,
      y: 0,
      width: this.canvas.width,
      height: this.canvas.height,
    }]
  }

  /**
   * Clear dirty regions
   */
  clearDirtyRegions(): void {
    this.dirtyRegions = []
  }

  /**
   * Queue a render operation
   */
  queueRender(renderFn: () => void): void {
    this.renderQueue.push(renderFn)
    this.startRenderLoop()
  }

  /**
   * Start render loop with frame rate control
   */
  startRenderLoop(): void {
    if (this.isRendering) return

    this.isRendering = true
    const targetFrameTime = 1000 / this.options.targetFPS

    const render = (currentTime: number) => {
      const deltaTime = currentTime - this.lastFrameTime

      // Frame skipping for performance
      if (this.options.enableFrameSkipping && deltaTime < targetFrameTime) {
        this.frameSkipCount++
        if (this.frameSkipCount < this.options.maxFrameSkip) {
          this.animationFrameId = requestAnimationFrame(render)
          return
        }
      }

      this.frameSkipCount = 0
      this.lastFrameTime = currentTime

      // Process render queue
      if (this.renderQueue.length > 0) {
        const renderFn = this.renderQueue.shift()
        if (renderFn) {
          renderFn()
        }
      }

      // Render dirty regions if enabled
      if (this.options.enableDirtyRegions && this.dirtyRegions.length > 0) {
        this.renderDirtyRegions()
      }

      this.animationFrameId = requestAnimationFrame(render)
    }

    this.animationFrameId = requestAnimationFrame(render)
  }

  /**
   * Stop render loop
   */
  stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.isRendering = false
    this.renderQueue = []
  }

  /**
   * Render only dirty regions
   */
  private renderDirtyRegions(): void {
    // Save current state
    this.ctx.save()

    // Clip to dirty regions
    for (const region of this.dirtyRegions) {
      this.ctx.beginPath()
      this.ctx.rect(region.x, region.y, region.width, region.height)
      this.ctx.clip()
    }

    // Render operations would go here
    // This is a placeholder - actual rendering is done by the caller

    // Restore state
    this.ctx.restore()

    // Clear dirty regions after rendering
    this.clearDirtyRegions()
  }

  /**
   * Draw image with optimization
   */
  drawImage(
    image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    sx?: number,
    sy?: number,
    sWidth?: number,
    sHeight?: number,
    dx?: number,
    dy?: number,
    dWidth?: number,
    dHeight?: number
  ): void {
    if (this.options.enableDirtyRegions) {
      // Mark drawn region as dirty
      if (dx !== undefined && dy !== undefined) {
        const width = dWidth !== undefined ? dWidth : (sWidth !== undefined ? sWidth : image.width)
        const height = dHeight !== undefined ? dHeight : (sHeight !== undefined ? sHeight : image.height)
        this.markDirty(dx, dy, width, height)
      }
    }

    // Use optimized drawImage with proper overloads
    // Canvas drawImage has 3 overloads:
    // 1. drawImage(image, dx, dy)
    // 2. drawImage(image, dx, dy, dWidth, dHeight)
    // 3. drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    
    if (sx !== undefined && sy !== undefined && sWidth !== undefined && sHeight !== undefined) {
      // 9-argument version: source rect + destination rect
      if (dx !== undefined && dy !== undefined && dWidth !== undefined && dHeight !== undefined) {
        this.ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      } else {
        // Invalid combination, use 5-argument version
        this.ctx.drawImage(image, sx, sy, sWidth, sHeight)
      }
    } else if (dx !== undefined && dy !== undefined) {
      // 4-argument version: destination position + size
      if (dWidth !== undefined && dHeight !== undefined) {
        this.ctx.drawImage(image, dx, dy, dWidth, dHeight)
      } else {
        // 2-argument version: destination position only
        this.ctx.drawImage(image, dx, dy)
      }
    } else {
      // No arguments: draw at origin
      this.ctx.drawImage(image, 0, 0)
    }
  }

  /**
   * Clear canvas efficiently
   */
  clear(): void {
    // Use clearRect for better performance than fillRect
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.markAllDirty()
  }

  /**
   * Get canvas context
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx
  }

  /**
   * Resize canvas with optimization
   */
  resize(width: number, height: number): void {
    const wasRendering = this.isRendering
    if (wasRendering) {
      this.stopRenderLoop()
    }

    // Preserve current content if needed
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    
    this.canvas.width = width
    this.canvas.height = height
    
    // Restore content
    this.ctx.putImageData(imageData, 0, 0)
    
    this.markAllDirty()

    if (wasRendering) {
      this.startRenderLoop()
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stopRenderLoop()
    this.clearDirtyRegions()
    this.renderQueue = []
  }
}

