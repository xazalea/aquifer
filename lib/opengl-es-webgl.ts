/**
 * OpenGL ES to WebGL Translation Layer
 * 
 * Translates OpenGL ES 2.0/3.0 API calls to WebGL 1.0/2.0
 * This allows Android games using OpenGL ES to render in the browser
 */

export class OpenGLESWebGL {
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null
  private gl2: WebGL2RenderingContext | null = null
  private canvas: HTMLCanvasElement
  private isWebGL2: boolean = false

  // OpenGL ES constants mapped to WebGL
  private constants: Map<number, number> = new Map()

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.initWebGL()
    this.setupConstants()
  }

  private initWebGL(): void {
    // Try WebGL 2.0 first (supports more OpenGL ES 3.0 features)
    const gl2Context = this.canvas.getContext('webgl2')
    if (gl2Context) {
      this.gl2 = gl2Context
      this.gl = gl2Context
      this.isWebGL2 = true
      console.log('WebGL 2.0 initialized')
      return
    }

    // Fallback to WebGL 1.0
    const glContext = this.canvas.getContext('webgl') || 
                     this.canvas.getContext('experimental-webgl')
    if (glContext) {
      this.gl = glContext as WebGLRenderingContext
      this.isWebGL2 = false
      console.log('WebGL 1.0 initialized')
      return
    }

    // WebGL not available - log warning but don't throw
    // The system will fall back to 2D canvas rendering
    console.warn('WebGL not supported in this browser. Graphics will be limited to 2D canvas rendering.')
    this.gl = null
    this.isWebGL2 = false
  }

  private setupConstants(): void {
    if (!this.gl) return

    // Map OpenGL ES constants to WebGL
    this.constants.set(0x0000, this.gl.ZERO) // GL_ZERO
    this.constants.set(0x0001, this.gl.ONE) // GL_ONE
    this.constants.set(0x0200, this.gl.DEPTH_TEST) // GL_DEPTH_TEST
    this.constants.set(0x0B71, this.gl.CULL_FACE) // GL_CULL_FACE
    this.constants.set(0x0BE2, this.gl.BLEND) // GL_BLEND
    this.constants.set(0x0D33, this.gl.SCISSOR_TEST) // GL_SCISSOR_TEST
    this.constants.set(0x1E00, this.gl.DEPTH_BUFFER_BIT) // GL_DEPTH_BUFFER_BIT
    this.constants.set(0x00004000, this.gl.COLOR_BUFFER_BIT) // GL_COLOR_BUFFER_BIT
    this.constants.set(0x1906, this.gl.TEXTURE_2D) // GL_TEXTURE_2D
    this.constants.set(0x2600, this.gl.TEXTURE_MIN_FILTER) // GL_TEXTURE_MIN_FILTER
    this.constants.set(0x2601, this.gl.TEXTURE_MAG_FILTER) // GL_TEXTURE_MAG_FILTER
    this.constants.set(0x2703, this.gl.TEXTURE_WRAP_S) // GL_TEXTURE_WRAP_S
    this.constants.set(0x2802, this.gl.TEXTURE_WRAP_T) // GL_TEXTURE_WRAP_T
    this.constants.set(0x2901, this.gl.REPEAT) // GL_REPEAT
    this.constants.set(0x812F, this.gl.CLAMP_TO_EDGE) // GL_CLAMP_TO_EDGE
    this.constants.set(0x2601, this.gl.LINEAR) // GL_LINEAR
    this.constants.set(0x2600, this.gl.NEAREST) // GL_NEAREST
    this.constants.set(0x8B31, this.gl.VERTEX_SHADER) // GL_VERTEX_SHADER
    this.constants.set(0x8B30, this.gl.FRAGMENT_SHADER) // GL_FRAGMENT_SHADER
    this.constants.set(0x8B82, this.gl.COMPILE_STATUS) // GL_COMPILE_STATUS
    this.constants.set(0x8B80, this.gl.LINK_STATUS) // GL_LINK_STATUS
    this.constants.set(0x8892, this.gl.ARRAY_BUFFER) // GL_ARRAY_BUFFER
    this.constants.set(0x8893, this.gl.ELEMENT_ARRAY_BUFFER) // GL_ELEMENT_ARRAY_BUFFER
    this.constants.set(0x88E4, this.gl.DYNAMIC_DRAW) // GL_DYNAMIC_DRAW
    this.constants.set(0x88E8, this.gl.STATIC_DRAW) // GL_STATIC_DRAW
    this.constants.set(0x1406, this.gl.FLOAT) // GL_FLOAT
    this.constants.set(0x1404, this.gl.UNSIGNED_SHORT) // GL_UNSIGNED_SHORT
    this.constants.set(0x1405, this.gl.UNSIGNED_INT) // GL_UNSIGNED_INT
    this.constants.set(0x0004, this.gl.TRIANGLES) // GL_TRIANGLES
    this.constants.set(0x0001, this.gl.LINES) // GL_LINES
    this.constants.set(0x0000, this.gl.POINTS) // GL_POINTS
  }

  /**
   * Get WebGL context
   */
  getContext(): WebGLRenderingContext | WebGL2RenderingContext | null {
    return this.gl
  }

  /**
   * Check if WebGL is available
   */
  isAvailable(): boolean {
    return this.gl !== null
  }

  /**
   * Translate OpenGL ES constant to WebGL
   */
  translateConstant(glConstant: number): number {
    return this.constants.get(glConstant) || glConstant
  }

  /**
   * Create shader (OpenGL ES glCreateShader)
   */
  createShader(type: number): WebGLShader | null {
    if (!this.gl) return null
    const webglType = this.translateConstant(type)
    return this.gl.createShader(webglType)
  }

  /**
   * Shader source (OpenGL ES glShaderSource)
   */
  shaderSource(shader: WebGLShader, source: string): void {
    if (!this.gl) return
    this.gl.shaderSource(shader, source)
  }

  /**
   * Compile shader (OpenGL ES glCompileShader)
   */
  compileShader(shader: WebGLShader): void {
    if (!this.gl) return
    this.gl.compileShader(shader)
  }

  /**
   * Create program (OpenGL ES glCreateProgram)
   */
  createProgram(): WebGLProgram | null {
    if (!this.gl) return null
    return this.gl.createProgram()
  }

  /**
   * Attach shader (OpenGL ES glAttachShader)
   */
  attachShader(program: WebGLProgram, shader: WebGLShader): void {
    if (!this.gl) return
    this.gl.attachShader(program, shader)
  }

  /**
   * Link program (OpenGL ES glLinkProgram)
   */
  linkProgram(program: WebGLProgram): void {
    if (!this.gl) return
    this.gl.linkProgram(program)
  }

  /**
   * Use program (OpenGL ES glUseProgram)
   */
  useProgram(program: WebGLProgram | null): void {
    if (!this.gl) return
    this.gl.useProgram(program)
  }

  /**
   * Create buffer (OpenGL ES glGenBuffers)
   */
  createBuffer(): WebGLBuffer | null {
    if (!this.gl) return null
    return this.gl.createBuffer()
  }

  /**
   * Bind buffer (OpenGL ES glBindBuffer)
   */
  bindBuffer(target: number, buffer: WebGLBuffer | null): void {
    if (!this.gl) return
    const webglTarget = this.translateConstant(target)
    this.gl.bindBuffer(webglTarget, buffer)
  }

  /**
   * Buffer data (OpenGL ES glBufferData)
   */
  bufferData(target: number, data: ArrayBufferView | ArrayBuffer, usage: number): void {
    if (!this.gl) return
    const webglTarget = this.translateConstant(target)
    const webglUsage = this.translateConstant(usage)
    this.gl.bufferData(webglTarget, data, webglUsage)
  }

  /**
   * Enable (OpenGL ES glEnable)
   */
  enable(cap: number): void {
    if (!this.gl) return
    const webglCap = this.translateConstant(cap)
    this.gl.enable(webglCap)
  }

  /**
   * Disable (OpenGL ES glDisable)
   */
  disable(cap: number): void {
    if (!this.gl) return
    const webglCap = this.translateConstant(cap)
    this.gl.disable(webglCap)
  }

  /**
   * Clear (OpenGL ES glClear)
   */
  clear(mask: number): void {
    if (!this.gl) {
      // Fallback to 2D canvas clear
      const ctx = this.canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      }
      return
    }
    let webglMask = 0
    if (mask & 0x1E00) webglMask |= this.gl.DEPTH_BUFFER_BIT
    if (mask & 0x00004000) webglMask |= this.gl.COLOR_BUFFER_BIT
    if (mask & 0x00000100) webglMask |= this.gl.STENCIL_BUFFER_BIT
    this.gl.clear(webglMask)
  }

  /**
   * Clear color (OpenGL ES glClearColor)
   */
  clearColor(red: number, green: number, blue: number, alpha: number): void {
    if (!this.gl) return
    this.gl.clearColor(red, green, blue, alpha)
  }

  /**
   * Viewport (OpenGL ES glViewport)
   */
  viewport(x: number, y: number, width: number, height: number): void {
    if (!this.gl) return
    this.gl.viewport(x, y, width, height)
  }

  /**
   * Draw arrays (OpenGL ES glDrawArrays)
   */
  drawArrays(mode: number, first: number, count: number): void {
    if (!this.gl) return
    const webglMode = this.translateConstant(mode)
    this.gl.drawArrays(webglMode, first, count)
  }

  /**
   * Draw elements (OpenGL ES glDrawElements)
   */
  drawElements(mode: number, count: number, type: number, offset: number): void {
    if (!this.gl) return
    const webglMode = this.translateConstant(mode)
    const webglType = this.translateConstant(type)
    this.gl.drawElements(webglMode, count, webglType, offset)
  }

  /**
   * Get attribute location (OpenGL ES glGetAttribLocation)
   */
  getAttribLocation(program: WebGLProgram, name: string): number {
    if (!this.gl) return -1
    return this.gl.getAttribLocation(program, name)
  }

  /**
   * Get uniform location (OpenGL ES glGetUniformLocation)
   */
  getUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    if (!this.gl) return null
    return this.gl.getUniformLocation(program, name)
  }

  /**
   * Vertex attrib pointer (OpenGL ES glVertexAttribPointer)
   */
  vertexAttribPointer(
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number
  ): void {
    if (!this.gl) return
    const webglType = this.translateConstant(type)
    this.gl.vertexAttribPointer(index, size, webglType, normalized, stride, offset)
  }

  /**
   * Enable vertex attrib array (OpenGL ES glEnableVertexAttribArray)
   */
  enableVertexAttribArray(index: number): void {
    if (!this.gl) return
    this.gl.enableVertexAttribArray(index)
  }

  /**
   * Create texture (OpenGL ES glGenTextures)
   */
  createTexture(): WebGLTexture | null {
    if (!this.gl) return null
    return this.gl.createTexture()
  }

  /**
   * Bind texture (OpenGL ES glBindTexture)
   */
  bindTexture(target: number, texture: WebGLTexture | null): void {
    if (!this.gl) return
    const webglTarget = this.translateConstant(target)
    this.gl.bindTexture(webglTarget, texture)
  }

  /**
   * Tex image 2D (OpenGL ES glTexImage2D)
   */
  texImage2D(
    target: number,
    level: number,
    internalformat: number,
    width: number,
    height: number,
    border: number,
    format: number,
    type: number,
    pixels: ArrayBufferView | null
  ): void {
    if (!this.gl) return
    const webglTarget = this.translateConstant(target)
    const webglFormat = this.translateConstant(format)
    const webglType = this.translateConstant(type)
    this.gl.texImage2D(webglTarget, level, webglFormat, width, height, border, webglFormat, webglType, pixels)
  }

  /**
   * Tex parameter (OpenGL ES glTexParameteri)
   */
  texParameteri(target: number, pname: number, param: number): void {
    if (!this.gl) return
    const webglTarget = this.translateConstant(target)
    const webglPname = this.translateConstant(pname)
    const webglParam = this.translateConstant(param)
    this.gl.texParameteri(webglTarget, webglPname, webglParam)
  }

  /**
   * Uniform matrix (OpenGL ES glUniformMatrix4fv)
   */
  uniformMatrix4fv(location: WebGLUniformLocation | null, transpose: boolean, value: Float32Array): void {
    if (!this.gl) return
    this.gl.uniformMatrix4fv(location, transpose, value)
  }

  /**
   * Check if WebGL 2.0 is available
   */
  isWebGL2Available(): boolean {
    return this.isWebGL2
  }
}

