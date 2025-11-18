/**
 * Game Renderer
 * 
 * Specialized renderer for 3D games with:
 * - WebGL optimization
 * - Texture management
 * - Shader caching
 * - Frame timing
 * - VSync control
 */

import { gamingOptimizer } from './gaming-optimizer'

export interface GameRendererConfig {
  canvas: HTMLCanvasElement
  enableVSync?: boolean
  enableAntialiasing?: boolean
  maxTextureSize?: number
  enableTextureCompression?: boolean
}

export class GameRenderer {
  private canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext | WebGLRenderingContext | null = null
  private config: Required<GameRendererConfig>
  private shaderCache: Map<string, WebGLProgram> = new Map()
  private textureCache: Map<string, WebGLTexture> = new Map()
  private frameCount: number = 0
  private lastFrameTime: number = 0
  private animationFrameId: number | null = null
  private isRendering: boolean = false

  constructor(config: GameRendererConfig) {
    this.canvas = config.canvas
    this.config = {
      canvas: config.canvas,
      enableVSync: config.enableVSync ?? true,
      enableAntialiasing: config.enableAntialiasing ?? false,
      maxTextureSize: config.maxTextureSize || 4096,
      enableTextureCompression: config.enableTextureCompression ?? true,
    }

    this.initializeWebGL()
  }

  /**
   * Initialize WebGL with gaming optimizations
   */
  private initializeWebGL(): void {
    const contextOptions: WebGLContextAttributes = {
      alpha: false, // Disable alpha for performance
      antialias: this.config.enableAntialiasing,
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance', // Prefer dedicated GPU
      desynchronized: true, // Allow async rendering
      failIfMajorPerformanceCaveat: false,
    }

    // Try WebGL2 first (better performance)
    this.gl = this.canvas.getContext('webgl2', contextOptions) as WebGL2RenderingContext

    // Fallback to WebGL1
    if (!this.gl) {
      this.gl = this.canvas.getContext('webgl', contextOptions) as WebGLRenderingContext
    }

    if (!this.gl) {
      throw new Error('WebGL not supported')
    }

    // Optimize WebGL for gaming
    gamingOptimizer.optimizeWebGL(this.gl)

    // Set optimal viewport
    this.resize(this.canvas.width, this.canvas.height)

    console.log('✅ Game renderer initialized')
  }

  /**
   * Resize canvas and viewport
   */
  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height

    if (this.gl) {
      this.gl.viewport(0, 0, width, height)
    }
  }

  /**
   * Create and cache shader program
   */
  createShaderProgram(vertexSource: string, fragmentSource: string, key?: string): WebGLProgram | null {
    if (!this.gl) return null

    const cacheKey = key || `${vertexSource.substring(0, 50)}_${fragmentSource.substring(0, 50)}`

    // Check cache
    if (this.shaderCache.has(cacheKey)) {
      return this.shaderCache.get(cacheKey)!
    }

    // Compile vertex shader
    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource)
    if (!vertexShader) return null

    // Compile fragment shader
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource)
    if (!fragmentShader) {
      this.gl.deleteShader(vertexShader)
      return null
    }

    // Create program
    const program = this.gl.createProgram()
    if (!program) return null

    this.gl.attachShader(program, vertexShader)
    this.gl.attachShader(program, fragmentShader)
    this.gl.linkProgram(program)

    // Check linking
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(program)
      console.error('Shader program link error:', error)
      this.gl.deleteProgram(program)
      this.gl.deleteShader(vertexShader)
      this.gl.deleteShader(fragmentShader)
      return null
    }

    // Cache program
    this.shaderCache.set(cacheKey, program)

    // Clean up shaders (they're attached to program)
    this.gl.deleteShader(vertexShader)
    this.gl.deleteShader(fragmentShader)

    return program
  }

  /**
   * Compile shader
   */
  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null

    const shader = this.gl.createShader(type)
    if (!shader) return null

    this.gl.shaderSource(shader, source)
    this.gl.compileShader(shader)

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader)
      console.error('Shader compile error:', error)
      this.gl.deleteShader(shader)
      return null
    }

    return shader
  }

  /**
   * Create and cache texture
   */
  createTexture(image: HTMLImageElement | HTMLCanvasElement, key?: string): WebGLTexture | null {
    if (!this.gl) return null

    const cacheKey = key || `texture_${this.textureCache.size}`

    // Check cache
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!
    }

    const texture = this.gl.createTexture()
    if (!texture) return null

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture)

    // Set texture parameters for gaming
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR)

    // Upload texture data
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image)

    // Generate mipmaps if needed
    if (this.isPowerOfTwo(image.width) && this.isPowerOfTwo(image.height)) {
      this.gl.generateMipmap(this.gl.TEXTURE_2D)
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, null)

    // Cache texture
    this.textureCache.set(cacheKey, texture)

    return texture
  }

  /**
   * Check if number is power of two
   */
  private isPowerOfTwo(value: number): boolean {
    return (value & (value - 1)) === 0
  }

  /**
   * Start render loop
   */
  startRenderLoop(renderFn: (deltaTime: number) => void): void {
    if (this.isRendering) return

    this.isRendering = true
    this.lastFrameTime = performance.now()

    const render = (currentTime: number) => {
      const deltaTime = currentTime - this.lastFrameTime
      this.lastFrameTime = currentTime

      // Clear screen
      if (this.gl) {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
      }

      // Render frame
      renderFn(deltaTime)

      this.frameCount++

      // Continue loop
      if (this.config.enableVSync) {
        this.animationFrameId = requestAnimationFrame(render)
      } else {
        // No VSync - render as fast as possible
        setTimeout(() => {
          this.animationFrameId = requestAnimationFrame(render)
        }, 0)
      }
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
  }

  /**
   * Get WebGL context
   */
  getGL(): WebGL2RenderingContext | WebGLRenderingContext | null {
    return this.gl
  }

  /**
   * Get frame count
   */
  getFrameCount(): number {
    return this.frameCount
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    if (this.gl) {
      // Delete shader programs
      for (const program of this.shaderCache.values()) {
        this.gl.deleteProgram(program)
      }

      // Delete textures
      for (const texture of this.textureCache.values()) {
        this.gl.deleteTexture(texture)
      }
    }

    this.shaderCache.clear()
    this.textureCache.clear()
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stopRenderLoop()
    this.clearCaches()

    if (this.gl) {
      const loseContext = this.gl.getExtension('WEBGL_lose_context')
      if (loseContext) {
        loseContext.loseContext()
      }
    }

    this.gl = null
  }
}

