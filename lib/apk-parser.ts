/**
 * APK Parser - Extracts and parses Android APK files
 * 
 * APK files are ZIP archives containing:
 * - classes.dex: Dalvik bytecode
 * - AndroidManifest.xml: App metadata
 * - resources.arsc: Compiled resources
 * - res/: Resource files
 * - META-INF/: Signing information
 * 
 * Optimized for performance with parallel processing and caching
 */

import JSZip from 'jszip'

export interface APKInfo {
  packageName: string
  versionCode: number
  versionName: string
  minSdkVersion: number
  targetSdkVersion: number
  applicationLabel: string
  dexFiles: ArrayBuffer[]
  resources: Map<string, ArrayBuffer>
  manifest: string
}

export class APKParser {
  private apkData: ArrayBuffer
  private static cache = new Map<string, APKInfo>()

  constructor(apkData: ArrayBuffer) {
    this.apkData = apkData
  }

  async parse(): Promise<APKInfo> {
    try {
      // Create cache key from first 1KB of APK (for quick identification)
      const cacheKey = await this.getCacheKey()
      if (APKParser.cache.has(cacheKey)) {
        console.log('Using cached APK info')
        return APKParser.cache.get(cacheKey)!
      }

      const zip = await JSZip.loadAsync(this.apkData)
      
      // Extract DEX files and manifest in parallel for better performance
      const [dexFiles, manifest, resources] = await Promise.all([
        this.extractDEXFiles(zip),
        this.extractManifest(zip),
        this.extractResources(zip),
      ])

      // Parse manifest for basic info (simplified - real parsing requires binary XML parser)
      const packageName = this.extractPackageName(manifest)
      const versionCode = this.extractVersionCode(manifest)
      const versionName = this.extractVersionName(manifest)

      const apkInfo: APKInfo = {
        packageName: packageName || 'unknown',
        versionCode: versionCode || 1,
        versionName: versionName || '1.0',
        minSdkVersion: 21, // Default
        targetSdkVersion: 33, // Default
        applicationLabel: packageName || 'Unknown App',
        dexFiles,
        resources,
        manifest,
      }

      // Cache the result
      APKParser.cache.set(cacheKey, apkInfo)
      
      // Limit cache size to prevent memory issues
      if (APKParser.cache.size > 10) {
        const firstKey = APKParser.cache.keys().next().value
        APKParser.cache.delete(firstKey)
      }

      return apkInfo
    } catch (error) {
      console.error('APK parsing failed:', error)
      throw new Error(`Failed to parse APK: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async extractDEXFiles(zip: JSZip): Promise<ArrayBuffer[]> {
    const dexFiles: ArrayBuffer[] = []
    const promises: Promise<void>[] = []

    for (const filename in zip.files) {
      const file = zip.files[filename]
      if (!file.dir && filename.endsWith('.dex')) {
        promises.push(
          file.async('arraybuffer')
            .then(arrayBuffer => dexFiles.push(arrayBuffer))
            .catch(e => console.warn('Failed to extract DEX file:', filename, e))
        )
      }
    }

    await Promise.all(promises)
    return dexFiles.sort() // Sort for consistent ordering
  }

  private async extractManifest(zip: JSZip): Promise<string> {
    const manifestFile = zip.files['AndroidManifest.xml']
    if (manifestFile) {
      try {
        return await manifestFile.async('string')
      } catch (e) {
        console.warn('Failed to extract manifest:', e)
      }
    }
    return ''
  }

  private async extractResources(zip: JSZip): Promise<Map<string, ArrayBuffer>> {
    const resources = new Map<string, ArrayBuffer>()
    const promises: Promise<void>[] = []

    for (const filename in zip.files) {
      const file = zip.files[filename]
      if (!file.dir && (filename.startsWith('res/') || filename.startsWith('assets/'))) {
        promises.push(
          file.async('arraybuffer')
            .then(arrayBuffer => resources.set(filename, arrayBuffer))
            .catch(e => console.warn('Failed to extract resource:', filename, e))
        )
      }
    }

    await Promise.all(promises)
    return resources
  }

  private async getCacheKey(): Promise<string> {
    // Use first 1KB + file size as cache key
    const header = new Uint8Array(this.apkData.slice(0, 1024))
    const size = this.apkData.byteLength
    const hash = Array.from(header)
      .slice(0, 16)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    return `${hash}-${size}`
  }

  private extractPackageName(manifest: string): string | null {
    if (!manifest) return null
    const match = manifest.match(/package=["']([^"']+)["']/)
    return match ? match[1] : null
  }

  private extractVersionCode(manifest: string): number | null {
    if (!manifest) return null
    const match = manifest.match(/versionCode=["'](\d+)["']/)
    return match ? parseInt(match[1], 10) : null
  }

  private extractVersionName(manifest: string): string | null {
    if (!manifest) return null
    const match = manifest.match(/versionName=["']([^"']+)["']/)
    return match ? match[1] : null
  }

  static async parseAPK(apkData: ArrayBuffer): Promise<APKInfo> {
    const parser = new APKParser(apkData)
    return parser.parse()
  }

  static clearCache(): void {
    APKParser.cache.clear()
  }
}
