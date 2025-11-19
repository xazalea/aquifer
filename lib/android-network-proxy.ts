/**
 * Android Network Proxy - Provides Internet Access for Browser Mode
 * 
 * Proxies network requests from Android apps to the browser's fetch API
 * This allows Android apps in browser mode to access the internet
 */

export class AndroidNetworkProxy {
  private static instance: AndroidNetworkProxy | null = null
  private requestQueue: Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }> = new Map()
  private requestIdCounter: number = 0

  static getInstance(): AndroidNetworkProxy {
    if (!AndroidNetworkProxy.instance) {
      AndroidNetworkProxy.instance = new AndroidNetworkProxy()
    }
    return AndroidNetworkProxy.instance
  }

  /**
   * Proxy HTTP request from Android app to browser fetch
   */
  async proxyRequest(url: string, method: string = 'GET', headers: Record<string, string> = {}, body?: ArrayBuffer): Promise<{
    status: number
    headers: Record<string, string>
    body: ArrayBuffer
  }> {
    try {
      console.log(`🌐 Proxying ${method} request to: ${url}`)
      
      // Convert ArrayBuffer to appropriate format for fetch
      const fetchOptions: RequestInit = {
        method,
        headers: {
          ...headers,
          // Remove Android-specific headers that might cause issues
        },
      }

      if (body) {
        fetchOptions.body = body
      }

      // Make request via browser's fetch API
      const response = await fetch(url, fetchOptions)
      
      // Read response body
      const responseBody = await response.arrayBuffer()
      
      // Convert headers
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      console.log(`✅ Request proxied successfully: ${response.status} ${url}`)
      
      return {
        status: response.status,
        headers: responseHeaders,
        body: responseBody,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`❌ Failed to proxy request to ${url}:`, errorMsg)
      throw new Error(`Network request failed: ${errorMsg}`)
    }
  }

  /**
   * Check if internet is available
   */
  async checkInternetAccess(): Promise<boolean> {
    try {
      // Try to fetch a small resource to check connectivity
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get network status
   */
  getNetworkStatus(): {
    online: boolean
    type: string
  } {
    if (typeof navigator !== 'undefined') {
      return {
        online: navigator.onLine,
        type: (navigator as any).connection?.effectiveType || 'unknown',
      }
    }
    return {
      online: true,
      type: 'unknown',
    }
  }
}

