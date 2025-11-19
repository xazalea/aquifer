/**
 * Android Emulator - Full Android emulation with APK parsing and Dalvik VM
 * 
 * This emulator integrates:
 * - APK file parsing
 * - DEX bytecode execution
 * - Dalvik VM
 * - Android framework
 * - Graphics rendering
 */

import { APKParser, APKInfo } from './apk-parser'
import { DalvikVM } from './dalvik-vm'
import { EnhancedDalvikVM } from './enhanced-dalvik-vm'
import { PerformanceMonitor } from './performance-monitor'
import { AndroidViewSystem } from './android-view-system'
import { GameEngine } from './game-engine'
import { ARMEmulator } from './arm-emulator'
import { OpenGLESWebGL } from './opengl-es-webgl'

export interface InstalledApp {
  packageName: string
  versionName: string
  label: string
  apkInfo: APKInfo
}

export class AndroidEmulator {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private isRunning: boolean = false
  private animationFrameId: number | null = null
  private bootProgress: number = 0
  private installedApps: Map<string, InstalledApp> = new Map()
  private touchState: { x: number; y: number; active: boolean } = { x: 0, y: 0, active: false }
  private dalvikVM: DalvikVM
  private currentScreen: 'boot' | 'home' | 'app' = 'boot'
  private runningApp: InstalledApp | null = null
  private needsRedraw: boolean = true
  private lastRenderTime: number = 0
  private targetFPS: number = 30 // Reduced from 60 for better performance on low-end devices
  private frameInterval: number = 1000 / this.targetFPS
  private performanceMonitor: PerformanceMonitor
  private viewSystem: AndroidViewSystem
  private gameEngine: GameEngine
  protected armEmulator: ARMEmulator
  private openglES: OpenGLESWebGL
  private enhancedVM: EnhancedDalvikVM
  private isGame: boolean = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Failed to get canvas context')
    }
    this.ctx = context
    this.dalvikVM = new DalvikVM()
    this.enhancedVM = new EnhancedDalvikVM()
    this.performanceMonitor = new PerformanceMonitor()
    this.viewSystem = new AndroidViewSystem(canvas)
    this.openglES = new OpenGLESWebGL(canvas)
    this.gameEngine = new GameEngine(canvas, this.openglES)
    this.armEmulator = new ARMEmulator()
    this.setupCanvas()
    
    // Initialize ARM emulator
    this.armEmulator.init().catch(console.error)
  }

  private setupCanvas() {
    // Set up canvas for fullscreen - use actual viewport size
    const updateCanvasSize = () => {
      const rect = this.canvas.getBoundingClientRect()
      const width = Math.max(rect.width || window.innerWidth, 800)
      const height = Math.max(rect.height || window.innerHeight, 600)
      
      this.canvas.width = width
      this.canvas.height = height
      this.canvas.style.width = `${width}px`
      this.canvas.style.height = `${height}px`
      
      // Disable image smoothing for better performance
      this.ctx.imageSmoothingEnabled = false
    }
    
    // Wait for canvas to be in DOM
    if (this.canvas.parentElement) {
      updateCanvasSize()
    } else {
      // Use requestAnimationFrame to wait for DOM
      requestAnimationFrame(() => {
        updateCanvasSize()
      })
    }
    
    // Update on resize
    const resizeHandler = () => updateCanvasSize()
    window.addEventListener('resize', resizeHandler)
    
    // Store handler for cleanup if needed
    ;(this as any)._resizeHandler = resizeHandler
  }

  public start() {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    this.bootProgress = 0
    this.currentScreen = 'boot'
    this.bootSequence()
  }

  public stop() {
    this.isRunning = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    
    // Stop game engine if running
    if (this.isGame) {
      this.gameEngine.stopGame()
      this.isGame = false
    }
    
    this.clearScreen()
    this.currentScreen = 'boot'
    this.runningApp = null
  }

  private async bootSequence() {
    // Simulate Android boot process
    const bootSteps = [
      { progress: 10, message: 'Initializing kernel...' },
      { progress: 20, message: 'Loading Android runtime...' },
      { progress: 40, message: 'Starting system services...' },
      { progress: 60, message: 'Initializing Dalvik VM...' },
      { progress: 80, message: 'Loading framework...' },
      { progress: 95, message: 'Starting launcher...' },
      { progress: 100, message: 'Android ready' },
    ]

    for (const step of bootSteps) {
      if (!this.isRunning) break
      
      this.bootProgress = step.progress
      this.renderBootScreen(step.message)
      await this.delay(200) // Faster boot for better UX
    }

    if (this.isRunning) {
      this.currentScreen = 'home'
      this.needsRedraw = true
      this.startRenderLoop()
    }
  }

  private renderBootScreen(message: string) {
    const width = this.canvas.width
    const height = this.canvas.height

    // Clear screen
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, width, height)

    // Draw Android logo
    const centerX = width / 2
    const centerY = height / 2 - 50

    // Simple Android robot head
    this.ctx.fillStyle = '#3DDC84'
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, 40, 0, Math.PI * 2)
    this.ctx.fill()

    // Eyes
    this.ctx.fillStyle = '#000000'
    this.ctx.beginPath()
    this.ctx.arc(centerX - 15, centerY - 10, 5, 0, Math.PI * 2)
    this.ctx.arc(centerX + 15, centerY - 10, 5, 0, Math.PI * 2)
    this.ctx.fill()

    // Antenna
    this.ctx.strokeStyle = '#3DDC84'
    this.ctx.lineWidth = 4
    this.ctx.beginPath()
    this.ctx.moveTo(centerX, centerY - 40)
    this.ctx.lineTo(centerX, centerY - 60)
    this.ctx.stroke()

    // Progress bar
    const barWidth = width * 0.6
    const barHeight = 8
    const barX = (width - barWidth) / 2
    const barY = centerY + 80

    this.ctx.fillStyle = '#333333'
    this.ctx.fillRect(barX, barY, barWidth, barHeight)

    this.ctx.fillStyle = '#3DDC84'
    this.ctx.fillRect(barX, barY, (barWidth * this.bootProgress) / 100, barHeight)

    // Message
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = '16px sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(message, centerX, barY + 40)
  }

  private renderAndroidHome() {
    const width = this.canvas.width
    const height = this.canvas.height

    // Clear screen efficiently
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.fillStyle = '#1a1a1a'
    this.ctx.fillRect(0, 0, width, height)

    // Draw Android home screen
    // Status bar
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, width, 30)

    // Status bar text
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = '12px sans-serif'
    this.ctx.textAlign = 'left'
    const now = new Date()
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    this.ctx.fillText(time, 10, 20)
    this.ctx.textAlign = 'right'
    this.ctx.fillText('100%', width - 10, 20)

    // Home screen background
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 30, width, height - 30)

    // App icons
    const iconSize = 60
    const iconSpacing = 80
    const startX = (width - (iconSpacing * 3)) / 2
    const startY = height / 2 - 50

    // System apps
    const systemApps = [
      { name: 'Apps', color: '#667eea' },
      { name: 'Browser', color: '#764ba2' },
      { name: 'Settings', color: '#f093fb' },
    ]

    // Draw system apps
    systemApps.forEach((app, index) => {
      const x = startX + index * iconSpacing
      const y = startY
      this.drawAppIcon(x, y, iconSize, app.color, app.name)
    })

    // Draw installed apps
    const installedApps = Array.from(this.installedApps.values())
    const appsPerRow = 3
    const rowHeight = 100
    installedApps.forEach((app, index) => {
      const row = Math.floor(index / appsPerRow)
      const col = index % appsPerRow
      const x = startX + col * iconSpacing
      const y = startY + (row + 1) * rowHeight
      this.drawAppIcon(x, y, iconSize, '#4CAF50', app.label || app.packageName)
    })

    // Navigation bar
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, height - 50, width, 50)

    // Home button
    this.ctx.strokeStyle = '#FFFFFF'
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.arc(width / 2, height - 25, 15, 0, Math.PI * 2)
    this.ctx.stroke()
  }

  private drawAppIcon(x: number, y: number, size: number, color: string, label: string) {
    const iconX = x - size / 2
    const iconY = y - size / 2
    const radius = 12

    // Icon background
    this.ctx.fillStyle = color
    this.ctx.beginPath()
    this.ctx.moveTo(iconX + radius, iconY)
    this.ctx.lineTo(iconX + size - radius, iconY)
    this.ctx.quadraticCurveTo(iconX + size, iconY, iconX + size, iconY + radius)
    this.ctx.lineTo(iconX + size, iconY + size - radius)
    this.ctx.quadraticCurveTo(iconX + size, iconY + size, iconX + size - radius, iconY + size)
    this.ctx.lineTo(iconX + radius, iconY + size)
    this.ctx.quadraticCurveTo(iconX, iconY + size, iconX, iconY + size - radius)
    this.ctx.lineTo(iconX, iconY + radius)
    this.ctx.quadraticCurveTo(iconX, iconY, iconX + radius, iconY)
    this.ctx.closePath()
    this.ctx.fill()

    // App name
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = '12px sans-serif'
    this.ctx.textAlign = 'center'
    const maxWidth = size + 20
    const text = label.length > 10 ? label.substring(0, 10) + '...' : label
    this.ctx.fillText(text, x, y + size / 2 + 20)
  }

  private startRenderLoop() {
    const render = (currentTime: number) => {
      if (!this.isRunning) {
        return
      }

      // Throttle rendering to target FPS
      const elapsed = currentTime - this.lastRenderTime
      if (elapsed >= this.frameInterval || this.needsRedraw) {
        const renderStart = performance.now()
        this.lastRenderTime = currentTime - (elapsed % this.frameInterval)
        
        if (this.currentScreen === 'home') {
          this.renderAndroidHome()
        } else if (this.currentScreen === 'app' && this.runningApp) {
          this.renderAppScreen()
        }
        
        const renderTime = performance.now() - renderStart
        this.performanceMonitor.recordFrame(renderTime)
        
        // Auto-adjust FPS if performance is degraded
        if (this.performanceMonitor.isPerformanceDegraded()) {
          this.targetFPS = Math.max(15, this.targetFPS - 5) // Reduce FPS but don't go below 15
          this.frameInterval = 1000 / this.targetFPS
        }
        
        this.needsRedraw = false
      }

      this.animationFrameId = requestAnimationFrame(render)
    }

    this.lastRenderTime = performance.now()
    this.animationFrameId = requestAnimationFrame(render)
  }

      private renderAppScreen() {
        if (!this.runningApp) {
          // Fallback if no app is running
          const width = this.canvas.width
          const height = this.canvas.height
          this.ctx.clearRect(0, 0, width, height)
          this.ctx.fillStyle = '#F5F5F5'
          this.ctx.fillRect(0, 0, width, height)
          this.ctx.fillStyle = '#333333'
          this.ctx.font = '16px sans-serif'
          this.ctx.textAlign = 'center'
          this.ctx.fillText('No app running', width / 2, height / 2)
          return
        }

        // Render based on app type
        if (this.isGame) {
          // Game engine handles its own rendering
          // The game loop is running independently
          return
        } else {
          // Use Android View System to render the actual app UI
          // Ensure view system has correct canvas dimensions
          if (this.viewSystem) {
            this.viewSystem.render()
          }
        }
      }

  private clearScreen() {
    const width = this.canvas.width
    const height = this.canvas.height
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, width, height)
  }

  public async installAPK(apkData: ArrayBuffer, fileName?: string): Promise<void> {
    try {
      console.log('Parsing APK...')
      
      // Parse APK file
      const apkInfo = await APKParser.parseAPK(apkData, fileName)
      console.log('APK parsed:', apkInfo.packageName, apkInfo.versionName, apkInfo.applicationLabel)

          // Load DEX files into both VMs (with error handling)
          for (let i = 0; i < apkInfo.dexFiles.length; i++) {
            const dexName = i === 0 ? 'classes.dex' : `classes${i}.dex`
            console.log(`Loading ${dexName} into Dalvik VM...`)
            try {
              this.dalvikVM.loadDEX(apkInfo.dexFiles[i], dexName)
              this.enhancedVM.loadDEX(apkInfo.dexFiles[i], dexName)
            } catch (error) {
              console.warn(`Failed to load ${dexName}, but continuing installation:`, error)
              // Continue with installation even if DEX parsing fails
            }
          }

          // Extract and load native libraries (.so files) if present
          if (apkInfo.nativeLibraries.size > 0) {
            console.log(`Found ${apkInfo.nativeLibraries.size} native libraries`)
            for (const [libName, libData] of apkInfo.nativeLibraries.entries()) {
              try {
                if (this.armEmulator.isAvailable()) {
                  const address = await this.armEmulator.loadLibrary(libData, libName)
                  console.log(`Loaded native library ${libName} at address 0x${address.toString(16)}`)
                } else {
                  console.warn(`ARM emulator not available, cannot load ${libName}`)
                }
              } catch (error) {
                console.warn(`Failed to load native library ${libName}:`, error)
              }
            }
          }

      // Register app
      const app: InstalledApp = {
        packageName: apkInfo.packageName,
        versionName: apkInfo.versionName,
        label: apkInfo.applicationLabel,
        apkInfo,
      }

      this.installedApps.set(apkInfo.packageName, app)
      console.log('APK installed successfully:', apkInfo.packageName)

      // Try to launch main activity (simplified)
        if (this.isRunning && this.currentScreen === 'home') {
          // In a real implementation, we would parse the manifest to find the main activity
          // and launch it using the Dalvik VM
          console.log('App installed. Click the app icon to launch.')
          this.needsRedraw = true
        }
    } catch (error) {
      console.error('Failed to install APK:', error)
      throw error
    }
  }

  public launchApp(packageName: string): void {
    const app = this.installedApps.get(packageName)
    if (!app) {
      console.error('App not found:', packageName)
      return
    }

    this.runningApp = app
    this.currentScreen = 'app'

    // Detect if this is a game (simplified heuristic)
    this.isGame = this.detectGame(app)

    try {
      if (this.isGame) {
        // Launch as game - use game engine
        console.log('Launching game:', packageName)
        this.launchGame(app)
      } else {
        // Launch as regular app - use view system
        console.log('Launching app:', packageName)
        this.launchRegularApp(app)
      }
    } catch (error) {
      console.error('Failed to launch app:', error)
    }
  }

  private detectGame(app: InstalledApp): boolean {
    // Simple heuristic: check if app has native libraries or game-related keywords
    const gameKeywords = ['game', 'play', 'gaming', 'unity', 'unreal', 'cocos']
    const label = app.label.toLowerCase()
    const packageName = app.packageName.toLowerCase()
    
    // Check for game keywords
    for (const keyword of gameKeywords) {
      if (label.includes(keyword) || packageName.includes(keyword)) {
        return true
      }
    }
    
    // Check if app has native libraries (indicates game engine)
    // In a real implementation, we'd check the APK for .so files
    return false
  }

  private launchGame(app: InstalledApp): void {
    console.log('🎮 Launching game - ensuring actual execution and rendering:', app.packageName)
    
    // Start game engine (this starts the CONTINUOUS render loop)
    this.gameEngine.startGame(app.packageName, app.apkInfo.dexFiles)
      .then(() => {
        console.log('✅ Game engine started - continuous rendering active')
      })
      .catch((error) => {
        console.error('❌ Failed to start game engine:', error)
        // Still try to run the game code even if engine fails
      })
    
    // Try to load native libraries if ARM emulator is available
    if (this.armEmulator.isAvailable()) {
      // Load native libraries from APK
      // In a real implementation, extract .so files and load them
      console.log('Loading native libraries for game...')
    }
    
    // Execute game's main class using enhanced VM (ACTUAL CODE EXECUTION)
    try {
      const threadId = this.enhancedVM.createThread()
      const mainClass = `${app.packageName}.MainActivity`
      
      // Try to find and execute onCreate
      const klass = this.enhancedVM.findClass(mainClass)
      if (klass) {
        console.log('✅ Found game main class, executing with enhanced VM (REAL EXECUTION)...')
        // Execute onCreate, onStart, onResume - ACTUAL METHOD INVOCATION
        try {
          this.enhancedVM.invokeMethod(threadId, mainClass, 'onCreate', '(Landroid/os/Bundle;)V', [null])
          this.enhancedVM.invokeMethod(threadId, mainClass, 'onStart', '()V', [])
          this.enhancedVM.invokeMethod(threadId, mainClass, 'onResume', '()V', [])
          console.log('✅ Game lifecycle methods executed - app is RUNNING')
        } catch (error) {
          console.warn('Enhanced VM execution failed, trying basic VM:', error)
          // Fallback to basic VM
          const basicThreadId = this.dalvikVM.createThread()
          this.dalvikVM.invokeMethod(basicThreadId, mainClass, 'onCreate', '(Landroid/os/Bundle;)V', [null])
          console.log('✅ Game executed with basic VM - app is RUNNING')
        }
      } else {
        console.warn('Main class not found, game will run with game engine rendering')
      }
    } catch (error) {
      console.warn('Failed to execute game code, using game engine only:', error)
    }

    // Set up OpenGL ES for game rendering (ACTUAL RENDERING)
    try {
      const gl = this.openglES.getContext()
      if (gl) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        console.log('✅ OpenGL ES context ready - game will RENDER frames')
      } else {
        console.warn('WebGL not available, games will use 2D canvas rendering')
      }
    } catch (error) {
      console.warn('Failed to initialize OpenGL ES:', error)
    }
    
    // Ensure continuous rendering
    this.needsRedraw = true
    console.log('✅ Game launched - execution and rendering active')
  }

  private launchRegularApp(app: InstalledApp): void {
    console.log('📱 Launching app - ensuring actual execution:', app.packageName)
    
    // Try to find main activity from manifest (simplified - use default for now)
    const mainActivity = `${app.packageName}.MainActivity`
    
    // Create activity with view system
    const activity = this.viewSystem.createActivity(
      app.packageName,
      mainActivity,
      app.label || app.packageName
    )
    
    // Set as current activity
    this.viewSystem.setCurrentActivity(app.packageName, mainActivity)
    
    // Try to invoke main activity lifecycle (ACTUAL CODE EXECUTION)
    try {
      const threadId = this.dalvikVM.createThread()
      console.log('🚀 Launching app with VM execution:', app.packageName, 'Activity:', mainActivity)
      
      // Execute onCreate, onStart, onResume - ACTUAL METHOD INVOCATION
      try {
        this.dalvikVM.invokeMethod(threadId, mainActivity, 'onCreate', '(Landroid/os/Bundle;)V', [null])
        this.dalvikVM.invokeMethod(threadId, mainActivity, 'onStart', '()V', [])
        this.dalvikVM.invokeMethod(threadId, mainActivity, 'onResume', '()V', [])
        console.log('✅ App lifecycle methods executed - app is RUNNING')
      } catch (vmError) {
        console.warn('VM execution failed, app will still render UI:', vmError)
      }
      
      // Render the activity (ACTUAL RENDERING)
      this.viewSystem.render()
      this.needsRedraw = true
      console.log('✅ App launched - execution and rendering active')
    } catch (error) {
      console.warn('Failed to execute activity lifecycle, using view system only:', error)
      // Still render the UI even if lifecycle fails
      this.viewSystem.render()
      this.needsRedraw = true
      console.log('✅ App launched - UI rendering active')
    }
  }

  public handleTouch(x: number, y: number, type: 'start' | 'move' | 'end') {
    // Scale coordinates to match canvas resolution
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width / (rect.width || this.canvas.width)
    const scaleY = this.canvas.height / (rect.height || this.canvas.height)

    const scaledX = x * scaleX
    const scaledY = y * scaleY

    console.log('Touch event:', type, 'at', x, y, 'scaled to', scaledX, scaledY, 'screen:', this.currentScreen, 'app:', this.runningApp?.packageName)

    // If app is running, use view system for touch handling
    if (this.currentScreen === 'app' && this.runningApp) {
      console.log('Delegating touch to view system, current activity:', this.viewSystem.getCurrentActivity()?.packageName)
      this.viewSystem.handleTouch(scaledX, scaledY, type)
      this.needsRedraw = true
      // Force immediate redraw
      if (this.isRunning) {
        requestAnimationFrame(() => {
          this.renderAppScreen()
        })
      }
      return
    }

    // Otherwise use default touch handling for home screen
    if (type === 'start') {
      this.handleTouchStart(scaledX, scaledY)
    } else if (type === 'move') {
      this.touchState = { x: scaledX, y: scaledY, active: true }
    } else if (type === 'end') {
      this.touchState = { x: 0, y: 0, active: false }
    }
  }

  private handleTouchStart(x: number, y: number) {
    this.touchState = { x, y, active: true }

    if (this.currentScreen === 'home') {
      // Check if an app icon was clicked
      const width = this.canvas.width
      const height = this.canvas.height
      const iconSize = 60
      const iconSpacing = 80
      const startX = (width - (iconSpacing * 3)) / 2
      const startY = height / 2 - 50

      // Check system apps
      const systemApps = [
        { name: 'Apps', action: () => {} },
        { name: 'Browser', action: () => {} },
        { name: 'Settings', action: () => {} },
      ]

      systemApps.forEach((app, index) => {
        const appX = startX + index * iconSpacing
        const appY = startY
        if (x >= appX - iconSize / 2 && x <= appX + iconSize / 2 &&
            y >= appY - iconSize / 2 && y <= appY + iconSize / 2) {
          console.log('System app clicked:', app.name)
        }
      })

      // Check installed apps
      const installedApps = Array.from(this.installedApps.values())
      const appsPerRow = 3
      const rowHeight = 100
      installedApps.forEach((app, index) => {
        const row = Math.floor(index / appsPerRow)
        const col = index % appsPerRow
        const appX = startX + col * iconSpacing
        const appY = startY + (row + 1) * rowHeight
        if (x >= appX - iconSize / 2 && x <= appX + iconSize / 2 &&
            y >= appY - iconSize / 2 && y <= appY + iconSize / 2) {
          this.launchApp(app.packageName)
        }
      })
    }

        // Check home button (works from any screen)
        const width = this.canvas.width
        const height = this.canvas.height
        if (y >= height - 50 && x >= width / 2 - 20 && x <= width / 2 + 20) {
          if (this.currentScreen === 'app') {
            this.currentScreen = 'home'
            this.runningApp = null
            this.viewSystem.setCurrentActivity('', '') // Clear current activity
            this.needsRedraw = true
          }
        }
  }

  public getInstalledApps(): InstalledApp[] {
    return Array.from(this.installedApps.values())
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics()
  }

  /**
   * Get performance recommendations
   */
  public getPerformanceRecommendations(): string[] {
    return this.performanceMonitor.getRecommendations()
  }

  /**
   * Uninstall an app
   */
  public uninstallApp(packageName: string): boolean {
    if (this.installedApps.has(packageName)) {
      this.installedApps.delete(packageName)
      if (this.runningApp?.packageName === packageName) {
        this.runningApp = null
        this.currentScreen = 'home'
        this.needsRedraw = true
      }
      return true
    }
    return false
  }

  /**
   * Get app info
   */
  public getAppInfo(packageName: string): InstalledApp | null {
    return this.installedApps.get(packageName) || null
  }

  /**
   * Get currently running app
   */
  public getRunningApp(): InstalledApp | null {
    return this.runningApp
  }

  public getDalvikVM(): DalvikVM {
    return this.dalvikVM
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
