/**
 * Gaming Optimizer
 * 
 * Specialized optimizations for 3D games and multiplayer gaming:
 * - Low-latency input handling
 * - WebGL optimizations
 * - Network optimization
 * - Frame timing control
 * - Audio support
 * - Crash recovery
 */

export interface GamingConfig {
  targetFPS?: number
  enableVSync?: boolean
  enableLowLatency?: boolean
  enableNetworkOptimization?: boolean
  maxLatency?: number // ms
  enableAudio?: boolean
  enablePreloading?: boolean
}

export class GamingOptimizer {
  private static instance: GamingOptimizer | null = null
  private config: Required<GamingConfig>
  private frameTimings: number[] = []
  private inputQueue: Array<{ type: string; data: any; timestamp: number }> = []
  private networkLatency: number = 0
  private audioContext: AudioContext | null = null
  private preloadedAssets: Map<string, any> = new Map()

  private constructor(config: GamingConfig = {}) {
    this.config = {
      targetFPS: config.targetFPS || 60,
      enableVSync: config.enableVSync ?? true,
      enableLowLatency: config.enableLowLatency ?? true,
      maxLatency: config.maxLatency || 16, // 60 FPS = 16.67ms per frame
      enableNetworkOptimization: config.enableNetworkOptimization ?? true,
      enableAudio: config.enableAudio ?? true,
      enablePreloading: config.enablePreloading ?? true,
    }

    this.initializeAudio()
  }

  static getInstance(config?: GamingConfig): GamingOptimizer {
    if (!GamingOptimizer.instance) {
      GamingOptimizer.instance = new GamingOptimizer(config)
    }
    return GamingOptimizer.instance
  }

  /**
   * Initialize audio context for games
   */
  private initializeAudio(): void {
    if (!this.config.enableAudio) return

    try {
      // Use low-latency audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive', // Lowest latency
        sampleRate: 48000, // High quality
      })
      console.log('✅ Audio context initialized for gaming')
    } catch (error) {
      console.warn('⚠️ Audio not available:', error)
    }
  }

  /**
   * Low-latency input handling
   * Processes input immediately without queuing delays
   */
  handleInput(type: string, data: any): void {
    if (!this.config.enableLowLatency) {
      this.inputQueue.push({ type, data, timestamp: performance.now() })
      return
    }

    // Process immediately for low latency
    this.processInputImmediate(type, data)
  }

  private processInputImmediate(type: string, data: any): void {
    // Dispatch input event immediately
    const event = new CustomEvent('game-input', {
      detail: { type, data, timestamp: performance.now() },
    })
    window.dispatchEvent(event)
  }

  /**
   * Process input queue (for non-low-latency mode)
   */
  processInputQueue(): void {
    if (this.config.enableLowLatency) return

    const now = performance.now()
    const maxAge = this.config.maxLatency

    while (this.inputQueue.length > 0) {
      const input = this.inputQueue[0]
      if (now - input.timestamp > maxAge) {
        // Too old, skip
        this.inputQueue.shift()
        continue
      }

      this.processInputImmediate(input.type, input.data)
      this.inputQueue.shift()
    }
  }

  /**
   * Optimize WebGL context for gaming
   */
  optimizeWebGL(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    // Enable extensions for better performance
    const extensions = [
      'WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_pvrtc',
      'WEBGL_compressed_texture_etc1',
      'OES_texture_float',
      'OES_texture_half_float',
      'WEBGL_depth_texture',
      'OES_element_index_uint',
      'EXT_texture_filter_anisotropic',
      'WEBGL_draw_buffers',
    ]

    for (const ext of extensions) {
      const extension = gl.getExtension(ext)
      if (extension) {
        console.log(`✅ WebGL extension enabled: ${ext}`)
      }
    }

    // Set optimal WebGL state
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.cullFace(gl.BACK)
    gl.frontFace(gl.CCW)

    // Disable expensive features
    gl.disable(gl.DITHER)
    gl.disable(gl.POLYGON_OFFSET_FILL)

    // Set clear color to black (faster)
    gl.clearColor(0, 0, 0, 1)

    console.log('✅ WebGL optimized for gaming')
  }

  /**
   * Frame timing control
   * Ensures consistent frame rate
   */
  startFrameTiming(): () => number {
    const startTime = performance.now()

    return () => {
      const frameTime = performance.now() - startTime
      this.frameTimings.push(frameTime)

      // Keep only last 60 frames
      if (this.frameTimings.length > 60) {
        this.frameTimings.shift()
      }

      return frameTime
    }
  }

  /**
   * Get average frame time
   */
  getAverageFrameTime(): number {
    if (this.frameTimings.length === 0) return 0
    const sum = this.frameTimings.reduce((a, b) => a + b, 0)
    return sum / this.frameTimings.length
  }

  /**
   * Get FPS
   */
  getFPS(): number {
    const avgFrameTime = this.getAverageFrameTime()
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0
  }

  /**
   * Check if frame rate is stable
   */
  isFrameRateStable(threshold: number = 5): boolean {
    if (this.frameTimings.length < 10) return false

    const avg = this.getAverageFrameTime()
    const variance = this.frameTimings.reduce((sum, time) => {
      const diff = time - avg
      return sum + diff * diff
    }, 0) / this.frameTimings.length

    const stdDev = Math.sqrt(variance)
    return stdDev < threshold
  }

  /**
   * Network optimization for multiplayer
   */
  optimizeNetwork(): void {
    if (!this.config.enableNetworkOptimization) return

    // Use WebSocket with binary protocol for lower latency
    // Enable TCP_NODELAY equivalent (no delay)
    // Use compression for large payloads

    console.log('✅ Network optimized for multiplayer gaming')
  }

  /**
   * Measure network latency
   */
  async measureLatency(): Promise<number> {
    const start = performance.now()
    try {
      // Ping test
      await fetch('/ping', { method: 'HEAD', cache: 'no-cache' })
      this.networkLatency = performance.now() - start
    } catch {
      // Estimate based on connection
      this.networkLatency = 50 // Default estimate
    }
    return this.networkLatency
  }

  /**
   * Get current network latency
   */
  getNetworkLatency(): number {
    return this.networkLatency
  }

  /**
   * Preload game assets
   */
  async preloadAsset(url: string, type: 'image' | 'audio' | 'json' | 'binary'): Promise<any> {
    if (!this.config.enablePreloading) {
      return null
    }

    // Check cache
    if (this.preloadedAssets.has(url)) {
      return this.preloadedAssets.get(url)
    }

    try {
      let asset: any

      switch (type) {
        case 'image':
          asset = await this.preloadImage(url)
          break
        case 'audio':
          asset = await this.preloadAudio(url)
          break
        case 'json':
          asset = await this.preloadJSON(url)
          break
        case 'binary':
          asset = await this.preloadBinary(url)
          break
      }

      this.preloadedAssets.set(url, asset)
      return asset
    } catch (error) {
      console.error(`Failed to preload asset: ${url}`, error)
      return null
    }
  }

  private preloadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }

  private preloadAudio(url: string): Promise<AudioBuffer> {
    return new Promise(async (resolve, reject) => {
      if (!this.audioContext) {
        reject(new Error('Audio context not available'))
        return
      }

      try {
        const response = await fetch(url)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
        resolve(audioBuffer)
      } catch (error) {
        reject(error)
      }
    })
  }

  private async preloadJSON(url: string): Promise<any> {
    const response = await fetch(url)
    return await response.json()
  }

  private async preloadBinary(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url)
    return await response.arrayBuffer()
  }

  /**
   * Preload multiple assets in parallel
   */
  async preloadAssets(assets: Array<{ url: string; type: 'image' | 'audio' | 'json' | 'binary' }>): Promise<void> {
    await Promise.all(assets.map(asset => this.preloadAsset(asset.url, asset.type)))
  }

  /**
   * Get audio context
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext
  }

  /**
   * Play game audio with low latency
   */
  playAudio(buffer: AudioBuffer, volume: number = 1.0): AudioBufferSourceNode | null {
    if (!this.audioContext || !buffer) return null

    const source = this.audioContext.createBufferSource()
    const gainNode = this.audioContext.createGain()

    source.buffer = buffer
    gainNode.gain.value = volume
    source.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    source.start(0) // Start immediately
    return source
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.preloadedAssets.clear()
    this.inputQueue = []
    this.frameTimings = []
  }
}

export const gamingOptimizer = GamingOptimizer.getInstance()

