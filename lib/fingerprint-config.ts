/**
 * Fingerprint API Configuration
 * 
 * Configuration for device fingerprinting service
 */

export const FINGERPRINT_API_KEY = 'gZRHetiksU9DkAqTJCCN'

export interface FingerprintConfig {
  apiKey: string
  enabled: boolean
}

export const fingerprintConfig: FingerprintConfig = {
  apiKey: FINGERPRINT_API_KEY,
  enabled: true,
}

