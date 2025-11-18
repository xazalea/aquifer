/**
 * Android View System - Renders actual Android UI components
 * 
 * This system parses Android layouts and renders them as canvas elements
 * Inspired by real Android view hierarchy
 */

export interface View {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  backgroundColor?: string
  text?: string
  textColor?: string
  textSize?: number
  onClick?: () => void
  children?: View[]
  visible: boolean
  enabled: boolean
}

export interface Activity {
  packageName: string
  className: string
  views: View[]
  title: string
}

export class AndroidViewSystem {
  private activities: Map<string, Activity> = new Map()
  private currentActivity: Activity | null = null
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  public onRenderCallback?: () => void // Callback to trigger emulator redraw

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Failed to get canvas context')
    }
    this.ctx = context
  }

  /**
   * Create a basic activity with a simple layout
   */
  createActivity(packageName: string, className: string, appLabel: string): Activity {
    // Create a basic activity with a simple UI
    const activity: Activity = {
      packageName,
      className,
      title: appLabel,
      views: this.createDefaultLayout(appLabel, packageName),
    }

    this.activities.set(`${packageName}/${className}`, activity)
    return activity
  }

  /**
   * Create a default layout for apps that don't have parsed layouts
   */
  private createDefaultLayout(appLabel: string, packageName: string): View[] {
    const width = this.canvas.width
    const height = this.canvas.height

    return [
      // Title bar
      {
        id: 'title_bar',
        type: 'LinearLayout',
        x: 0,
        y: 0,
        width: width,
        height: 50,
        backgroundColor: '#2196F3',
        visible: true,
        enabled: true,
        children: [
          {
            id: 'title_text',
            type: 'TextView',
            x: 10,
            y: 0,
            width: width - 20,
            height: 50,
            text: appLabel,
            textColor: '#FFFFFF',
            textSize: 18,
            visible: true,
            enabled: true,
          },
        ],
      },
      // Content area
      {
        id: 'content_area',
        type: 'LinearLayout',
        x: 0,
        y: 50,
        width: width,
        height: height - 100,
        backgroundColor: '#F5F5F5',
        visible: true,
        enabled: true,
        children: [
          {
            id: 'welcome_text',
            type: 'TextView',
            x: width / 2 - 100,
            y: height / 2 - 100,
            width: 200,
            height: 40,
            text: 'Welcome to ' + appLabel,
            textColor: '#333333',
            textSize: 20,
            visible: true,
            enabled: true,
          },
          {
            id: 'package_text',
            type: 'TextView',
            x: width / 2 - 150,
            y: height / 2 - 50,
            width: 300,
            height: 30,
            text: 'Package: ' + packageName,
            textColor: '#666666',
            textSize: 14,
            visible: true,
            enabled: true,
          },
          {
            id: 'status_text',
            type: 'TextView',
            x: width / 2 - 100,
            y: height / 2,
            width: 200,
            height: 30,
            text: 'App is running',
            textColor: '#4CAF50',
            textSize: 16,
            visible: true,
            enabled: true,
          },
          // Add a simple button
          {
            id: 'action_button',
            type: 'Button',
            x: width / 2 - 75,
            y: height / 2 + 50,
            width: 150,
            height: 50,
            backgroundColor: '#4CAF50',
            text: 'Click Me',
            textColor: '#FFFFFF',
            textSize: 16,
            visible: true,
            enabled: true,
            onClick: (() => {
              const viewSystem = this
              return () => {
                console.log('Button clicked!')
                // Update the status text
                const statusView = viewSystem.findView('status_text')
                if (statusView) {
                  statusView.text = 'Button was clicked!'
                  // Re-render after update
                  viewSystem.render()
                  // Trigger emulator redraw
                  if ((viewSystem as any).onRenderCallback) {
                    (viewSystem as any).onRenderCallback()
                  }
                }
              }
            })(),
          },
        ],
      },
      // Navigation bar
      {
        id: 'nav_bar',
        type: 'LinearLayout',
        x: 0,
        y: height - 50,
        width: width,
        height: 50,
        backgroundColor: '#000000',
        visible: true,
        enabled: true,
        children: [
          {
            id: 'back_button',
            type: 'Button',
            x: width / 2 - 20,
            y: height - 50,
            width: 40,
            height: 50,
            backgroundColor: 'transparent',
            text: '◄',
            textColor: '#FFFFFF',
            textSize: 24,
            visible: true,
            enabled: true,
            onClick: () => {
              console.log('Back button clicked')
            },
          },
        ],
      },
    ]
  }

  private needsRedraw: boolean = false
  private findView(id: string, views?: View[]): View | null {
    const searchViews = views || this.currentActivity?.views || []
    for (const view of searchViews) {
      if (view.id === id) {
        return view
      }
      if (view.children) {
        const found = this.findView(id, view.children)
        if (found) return found
      }
    }
    return null
  }

  /**
   * Set the current activity
   */
  setCurrentActivity(packageName: string, className: string): boolean {
    const key = `${packageName}/${className}`
    const activity = this.activities.get(key)
    if (activity) {
      this.currentActivity = activity
      return true
    }
    return false
  }

  /**
   * Render the current activity
   */
  render(): void {
    if (!this.currentActivity) {
      return
    }

    const width = this.canvas.width
    const height = this.canvas.height

    // Clear screen
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.fillStyle = '#F5F5F5'
    this.ctx.fillRect(0, 0, width, height)

    // Render all views
    for (const view of this.currentActivity.views) {
      this.renderView(view)
    }
  }

  /**
   * Render a single view and its children
   */
  private renderView(view: View): void {
    if (!view.visible) {
      return
    }

    // Render background
    if (view.backgroundColor && view.backgroundColor !== 'transparent') {
      this.ctx.fillStyle = view.backgroundColor
      this.ctx.fillRect(view.x, view.y, view.width, view.height)
    }

    // Render text for TextView and Button
    if ((view.type === 'TextView' || view.type === 'Button') && view.text) {
      this.ctx.fillStyle = view.textColor || '#000000'
      this.ctx.font = `${view.textSize || 14}px sans-serif`
      this.ctx.textAlign = 'left'
      this.ctx.textBaseline = 'middle'

      // Center text for buttons
      if (view.type === 'Button') {
        this.ctx.textAlign = 'center'
        this.ctx.fillText(
          view.text,
          view.x + view.width / 2,
          view.y + view.height / 2
        )
      } else {
        this.ctx.fillText(view.text, view.x, view.y + view.height / 2)
      }
    }

    // Render border for buttons
    if (view.type === 'Button' && view.enabled) {
      this.ctx.strokeStyle = view.backgroundColor === 'transparent' ? '#FFFFFF' : '#CCCCCC'
      this.ctx.lineWidth = 1
      this.ctx.strokeRect(view.x, view.y, view.width, view.height)
    }

    // Render children
    if (view.children) {
      for (const child of view.children) {
        this.renderView(child)
      }
    }
  }

  /**
   * Handle touch event
   */
  handleTouch(x: number, y: number, type: 'start' | 'move' | 'end'): void {
    if (type !== 'start' || !this.currentActivity) {
      return
    }

    // Find the view that was touched
    const touchedView = this.findViewAt(x, y, this.currentActivity.views)
    if (touchedView && touchedView.enabled && touchedView.onClick) {
      console.log('View touched:', touchedView.id, 'at', x, y)
      touchedView.onClick()
      this.render() // Re-render after click
      // Trigger emulator redraw
      if (this.onRenderCallback) {
        this.onRenderCallback()
      }
    } else {
      console.log('No clickable view at', x, y, 'touchedView:', touchedView?.id)
    }
  }

  /**
   * Find view at coordinates
   */
  private findViewAt(x: number, y: number, views?: View[]): View | null {
    const searchViews = views || this.currentActivity?.views || []
    
    // Search in reverse order (top to bottom)
    for (let i = searchViews.length - 1; i >= 0; i--) {
      const view = searchViews[i]
      if (!view.visible || !view.enabled) {
        continue
      }

      // Check children first (they're on top)
      if (view.children) {
        const childView = this.findViewAt(x, y, view.children)
        if (childView) {
          return childView
        }
      }

      // Check if point is within view bounds
      if (
        x >= view.x &&
        x <= view.x + view.width &&
        y >= view.y &&
        y <= view.y + view.height
      ) {
        return view
      }
    }

    return null
  }

  /**
   * Update view text
   */
  updateViewText(viewId: string, text: string): void {
    const view = this.findView(viewId)
    if (view) {
      view.text = text
      this.render()
    }
  }

  /**
   * Get current activity
   */
  getCurrentActivity(): Activity | null {
    return this.currentActivity
  }
}

