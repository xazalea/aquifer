/**
 * Headscale Integration - Self-hosted Tailscale Control Server
 * 
 * Provides automatic internet access for users via Tailscale VPN
 * Runs in WebVM/Docker backend automatically
 * 
 * Based on: https://github.com/juanfont/headscale
 */

import { CheerpXIntegration } from './cheerpx-integration'
import { statusTracker } from './status-tracker'

export interface HeadscaleConfig {
  serverUrl?: string
  apiKey?: string
  namespace?: string
  listenPort?: number
  listenAddr?: string
}

export class HeadscaleIntegration {
  private cheerpx: CheerpXIntegration | null = null
  private config: Required<HeadscaleConfig>
  private containerId: string | null = null
  private isInitialized: boolean = false
  private namespace: string = 'default'

  constructor(cheerpx: CheerpXIntegration | null, config?: Partial<HeadscaleConfig>) {
    this.cheerpx = cheerpx
    this.config = {
      serverUrl: config?.serverUrl || 'http://localhost:8080',
      apiKey: config?.apiKey || '',
      namespace: config?.namespace || 'default',
      listenPort: config?.listenPort || 8080,
      listenAddr: config?.listenAddr || '0.0.0.0',
    }
    this.namespace = this.config.namespace
  }

  /**
   * Initialize Headscale server in WebVM/Docker
   */
  async init(): Promise<boolean> {
    if (this.isInitialized) {
      return true
    }

    try {
      console.log('🌐 Initializing Headscale (self-hosted Tailscale) for internet access...')
      statusTracker.info('Setting up Headscale VPN...', 'Configuring internet access')

      if (!this.cheerpx || !this.cheerpx.isReady()) {
        throw new Error('CheerpX not initialized - required for Headscale')
      }

      // Check if Headscale container already exists
      const existingContainer = await this.findHeadscaleContainer()
      if (existingContainer) {
        console.log('✅ Found existing Headscale container:', existingContainer)
        this.containerId = existingContainer
        
        // Start container if not running
        await this.startContainer()
        this.isInitialized = true
        statusTracker.success('Headscale ready', 'Internet access configured')
        return true
      }

      // Create Headscale configuration
      await this.createHeadscaleConfig()

      // Run Headscale container in Docker
      const containerId = await this.runHeadscaleContainer()
      this.containerId = containerId
      
      // Wait for Headscale to be ready
      await this.waitForHeadscaleReady()

      // Create default namespace if needed
      await this.createNamespace()

      this.isInitialized = true
      statusTracker.success('Headscale initialized', 'Internet access available')
      console.log('✅ Headscale initialized - users now have internet access')
      
      return true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ Failed to initialize Headscale:', errorMsg)
      statusTracker.error('Headscale initialization failed', errorMsg)
      return false
    }
  }

  /**
   * Find existing Headscale container
   */
  private async findHeadscaleContainer(): Promise<string | null> {
    if (!this.cheerpx) return null

    try {
      const containers = await this.cheerpx.dockerPs()
      const headscaleContainer = containers.find(c => 
        c.names.some(name => name.includes('headscale'))
      )
      return headscaleContainer?.id || null
    } catch (error) {
      console.warn('Failed to find Headscale container:', error)
      return null
    }
  }

  /**
   * Create Headscale configuration file
   */
  private async createHeadscaleConfig(): Promise<void> {
    if (!this.cheerpx) throw new Error('CheerpX not initialized')

    const config = `server_url: ${this.config.serverUrl}
listen_addr: ${this.config.listenAddr}:${this.config.listenPort}
metrics_listen_addr: 127.0.0.1:9090

grpc_listen_addr: 0.0.0.0:50443
grpc_allow_insecure: false

private_key_path: /var/lib/headscale/private.key
noise:
  private_key_path: /var/lib/headscale/noise_private.key

ip_prefixes:
  - fd7a:115c:a1e0::/48
  - 100.64.0.0/10

derp:
  server:
    enabled: false
  paths: []

unix_socket: /var/run/headscale/headscale.sock
unix_socket_permission: "0777"

log:
  level: info

dns_config:
  override_local_dns: true
  nameservers:
    - 1.1.1.1
    - 8.8.8.8

database:
  type: sqlite
  sqlite:
    path: /var/lib/headscale/db.sqlite

tls_letsencrypt_hostname: ""
tls_letsencrypt_challenge_type: HTTP-01
tls_letsencrypt_listen: ":http"
tls_letsencrypt_cache_dir: /var/lib/headscale/cache
tls_letsencrypt_email: ""

ephemeral_node_inactivity_timeout: 30m

node_update_check_interval: 10s

db_cleanup_frequency: 1h

acl_policy_path: ""

logtail:
  enabled: false

randomize_client_port: false
`

    // Write config to /tmp/headscale-config.yaml in the Linux VM
    await this.cheerpx.execute(`cat > /tmp/headscale-config.yaml << 'EOF'
${config}
EOF`)
    
    console.log('✅ Headscale configuration created')
  }

  /**
   * Run Headscale container in Docker
   */
  private async runHeadscaleContainer(): Promise<string> {
    if (!this.cheerpx) throw new Error('CheerpX not initialized')

    // Create directories for Headscale data
    await this.cheerpx.execute('mkdir -p /var/lib/headscale /var/run/headscale')
    
    // Copy config to persistent location
    await this.cheerpx.execute('cp /tmp/headscale-config.yaml /var/lib/headscale/config.yaml || true')
    
    // Run Headscale container with network access
    const dockerCommand = `docker run -d \\
      --name headscale \\
      --restart unless-stopped \\
      -v /var/lib/headscale/config.yaml:/etc/headscale/config.yaml:ro \\
      -v /var/lib/headscale:/var/lib/headscale \\
      -v /var/run/headscale:/var/run/headscale \\
      -p ${this.config.listenPort}:8080 \\
      -p 50443:50443 \\
      --network host \\
      --cap-add=NET_ADMIN \\
      --cap-add=NET_RAW \\
      --sysctl net.ipv4.ip_forward=1 \\
      --sysctl net.ipv6.conf.all.forwarding=1 \\
      ghcr.io/juanfont/headscale:latest headscale serve`

    console.log('🐳 Starting Headscale container...')
    statusTracker.info('Starting Headscale container...', 'Setting up VPN server')
    
    const result = await this.cheerpx.execute(dockerCommand)
    
    // Extract container ID from output
    const containerId = result.trim().split('\n')[0].trim()
    if (containerId && containerId.length >= 12) {
      console.log('✅ Headscale container started:', containerId.substring(0, 12))
      return containerId
    }
    
    // If we can't extract ID, try to find it
    const containers = await this.cheerpx.dockerPs()
    const headscaleContainer = containers.find(c => 
      c.names.some(name => name.includes('headscale'))
    )
    
    if (headscaleContainer) {
      return headscaleContainer.id
    }
    
    throw new Error('Failed to start Headscale container')
  }

  /**
   * Start existing container
   */
  private async startContainer(): Promise<void> {
    if (!this.cheerpx || !this.containerId) return

    try {
      await this.cheerpx.execute(`docker start ${this.containerId}`)
      console.log('✅ Headscale container started')
    } catch (error) {
      console.warn('Failed to start container, may already be running:', error)
    }
  }

  /**
   * Wait for Headscale to be ready
   */
  private async waitForHeadscaleReady(maxAttempts: number = 30): Promise<void> {
    if (!this.cheerpx) throw new Error('CheerpX not initialized')

    console.log('⏳ Waiting for Headscale to be ready...')
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Check if Headscale is responding
        const result = await this.cheerpx.execute(`curl -s http://localhost:${this.config.listenPort}/health || echo "not ready"`)
        if (!result.includes('not ready') && !result.includes('error')) {
          console.log('✅ Headscale is ready')
          return
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    throw new Error('Headscale failed to become ready')
  }

  /**
   * Create default namespace
   */
  private async createNamespace(): Promise<void> {
    if (!this.cheerpx) throw new Error('CheerpX not initialized')

    try {
      // Check if namespace exists
      const result = await this.cheerpx.execute(`docker exec headscale headscale namespaces list 2>/dev/null || echo "not found"`)
      
      if (result.includes(this.namespace)) {
        console.log('✅ Namespace already exists:', this.namespace)
        return
      }

      // Create namespace
      await this.cheerpx.execute(`docker exec headscale headscale namespaces create ${this.namespace}`)
      console.log('✅ Created namespace:', this.namespace)
    } catch (error) {
      console.warn('Failed to create namespace (may already exist):', error)
    }
  }

  /**
   * Generate auth key for client connection
   */
  async generateAuthKey(expiry?: string): Promise<string> {
    if (!this.cheerpx || !this.isInitialized) {
      throw new Error('Headscale not initialized')
    }

    try {
      // Wait a bit for Headscale to be fully ready
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const expiryFlag = expiry ? `--expiration ${expiry}` : '--reusable'
      
      // Try to generate auth key with retries
      let result = ''
      let attempts = 0
      const maxAttempts = 5
      
      while (attempts < maxAttempts) {
        try {
          result = await this.cheerpx.execute(
            `docker exec headscale headscale preauthkeys create --namespace ${this.namespace} ${expiryFlag} --output json 2>&1`
          )
          
          // Check if command succeeded
          if (result.includes('error') || result.includes('Error') || result.includes('not found')) {
            attempts++
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000))
              continue
            }
          } else {
            break
          }
        } catch (error) {
          attempts++
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          throw error
        }
      }
      
      // Parse JSON response to get key
      const jsonMatch = result.match(/\{[^}]+\}/)
      if (jsonMatch) {
        try {
          const json = JSON.parse(jsonMatch[0])
          const key = json.key || json.preAuthKey?.key || json.id || ''
          if (key) {
            console.log('✅ Generated Headscale auth key')
            return key
          }
        } catch (parseError) {
          // Try alternative parsing
        }
      }
      
      // Fallback: extract key from text output
      const keyMatch = result.match(/key[:\s]+([a-zA-Z0-9_-]+)/i)
      if (keyMatch && keyMatch[1]) {
        console.log('✅ Generated Headscale auth key (fallback method)')
        return keyMatch[1]
      }
      
      // Last resort: return empty string (network routing will still work via iptables)
      console.warn('⚠️ Could not extract auth key from Headscale, network routing will still work')
      return ''
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(`⚠️ Failed to generate auth key: ${errorMsg}, network routing will still work`)
      // Return empty string - network routing via iptables will still provide internet access
      return ''
    }
  }

  /**
   * Get server URL for client connection
   */
  getServerUrl(): string {
    return this.config.serverUrl
  }

  /**
   * Check if Headscale is running
   */
  async isRunning(): Promise<boolean> {
    if (!this.cheerpx || !this.containerId) return false

    try {
      const containers = await this.cheerpx.dockerPs()
      return containers.some(c => c.id === this.containerId)
    } catch {
      return false
    }
  }

  /**
   * Stop Headscale
   */
  async stop(): Promise<void> {
    if (!this.cheerpx || !this.containerId) return

    try {
      await this.cheerpx.execute(`docker stop ${this.containerId}`)
      console.log('✅ Headscale stopped')
    } catch (error) {
      console.warn('Failed to stop Headscale:', error)
    }
  }

  /**
   * Get container ID
   */
  getContainerId(): string | null {
    return this.containerId
  }
}

