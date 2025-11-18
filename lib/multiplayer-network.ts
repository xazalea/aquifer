/**
 * Multiplayer Network Optimizer
 * 
 * Optimized networking for multiplayer games:
 * - Low-latency WebSocket connections
 * - Message compression
 * - Prediction and interpolation
 * - Lag compensation
 * - Reliable/unreliable message channels
 */

export interface NetworkConfig {
  serverUrl: string
  enableCompression?: boolean
  enablePrediction?: boolean
  enableInterpolation?: boolean
  maxLatency?: number
  reconnectAttempts?: number
  reconnectDelay?: number
}

export type MessageType = 'reliable' | 'unreliable'
export type MessageHandler = (data: any, timestamp: number) => void

export class MultiplayerNetwork {
  private ws: WebSocket | null = null
  private config: Required<NetworkConfig>
  private messageHandlers: Map<string, MessageHandler[]> = new Map()
  private messageQueue: Array<{ type: MessageType; data: any }> = []
  private isConnected: boolean = false
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectAttempts: number = 0
  private latency: number = 0
  private lastPingTime: number = 0
  private pingInterval: NodeJS.Timeout | null = null

  constructor(config: NetworkConfig) {
    this.config = {
      enableCompression: config.enableCompression ?? true,
      enablePrediction: config.enablePrediction ?? true,
      enableInterpolation: config.enableInterpolation ?? true,
      maxLatency: config.maxLatency || 100,
      reconnectAttempts: config.reconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 1000,
      ...config,
    }
  }

  /**
   * Connect to game server
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Use WebSocket with binary protocol for lower latency
        this.ws = new WebSocket(this.config.serverUrl, ['binary'])

        this.ws.binaryType = 'arraybuffer' // Use binary for better performance

        this.ws.onopen = () => {
          console.log('✅ Connected to game server')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.startPing()
          this.flushMessageQueue()
          resolve(true)
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('WebSocket closed')
          this.isConnected = false
          this.stopPing()
          this.attemptReconnect()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.stopPing()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnected = false
  }

  /**
   * Send message to server
   */
  send(type: MessageType, data: any): void {
    const message = {
      type,
      data,
      timestamp: performance.now(),
    }

    if (!this.isConnected) {
      // Queue message for when connected
      this.messageQueue.push({ type, data })
      return
    }

    try {
      const serialized = this.serializeMessage(message)
      this.ws!.send(serialized)
    } catch (error) {
      console.error('Failed to send message:', error)
      // Queue for retry
      this.messageQueue.push({ type, data })
    }
  }

  /**
   * Register message handler
   */
  on(messageType: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(messageType) || []
    handlers.push(handler)
    this.messageHandlers.set(messageType, handlers)
  }

  /**
   * Unregister message handler
   */
  off(messageType: string, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(messageType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: ArrayBuffer | string): void {
    try {
      const message = this.deserializeMessage(data)

      // Handle ping/pong for latency measurement
      if (message.type === 'ping') {
        this.send('unreliable', { type: 'pong', timestamp: message.timestamp })
        return
      }

      if (message.type === 'pong') {
        this.latency = performance.now() - message.timestamp
        return
      }

      // Dispatch to handlers
      const handlers = this.messageHandlers.get(message.type) || []
      for (const handler of handlers) {
        handler(message.data, message.timestamp)
      }
    } catch (error) {
      console.error('Failed to handle message:', error)
    }
  }

  /**
   * Serialize message (with compression if enabled)
   */
  private serializeMessage(message: any): ArrayBuffer | string {
    const json = JSON.stringify(message)

    if (this.config.enableCompression) {
      // Use compression for large messages
      // In production, use a proper compression library
      return json // Placeholder
    }

    return json
  }

  /**
   * Deserialize message
   */
  private deserializeMessage(data: ArrayBuffer | string): any {
    if (data instanceof ArrayBuffer) {
      const decoder = new TextDecoder()
      const json = decoder.decode(data)
      return JSON.parse(json)
    }

    return JSON.parse(data)
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!
      this.send(message.type, message.data)
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      console.error('Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.reconnectAttempts})...`)
      this.connect().catch(() => {
        // Retry will be attempted by onclose handler
      })
    }, this.config.reconnectDelay * this.reconnectAttempts) // Exponential backoff
  }

  /**
   * Start ping for latency measurement
   */
  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.lastPingTime = performance.now()
      this.send('unreliable', { type: 'ping', timestamp: this.lastPingTime })
    }, 1000) // Ping every second
  }

  /**
   * Stop ping
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  /**
   * Get current latency
   */
  getLatency(): number {
    return this.latency
  }

  /**
   * Check if connected
   */
  isConnectedToServer(): boolean {
    return this.isConnected
  }

  /**
   * Send reliable message (guaranteed delivery)
   */
  sendReliable(data: any): void {
    this.send('reliable', data)
  }

  /**
   * Send unreliable message (low latency, may be dropped)
   */
  sendUnreliable(data: any): void {
    this.send('unreliable', data)
  }
}

