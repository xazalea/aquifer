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
  nativeLibraries: Map<string, ArrayBuffer>
  manifest: string
}

export class APKParser {
  private apkData: ArrayBuffer
  private static cache = new Map<string, APKInfo>()

  constructor(apkData: ArrayBuffer) {
    this.apkData = apkData
  }

  async parse(fileName?: string): Promise<APKInfo> {
    try {
      // Create cache key from first 1KB of APK (for quick identification)
      const cacheKey = await this.getCacheKey()
      if (APKParser.cache.has(cacheKey)) {
        console.log('Using cached APK info')
        return APKParser.cache.get(cacheKey)!
      }

      const zip = await JSZip.loadAsync(this.apkData)
      
      // Extract DEX files, manifest, resources, and native libraries in parallel
      const [dexFiles, manifest, resources, nativeLibraries] = await Promise.all([
        this.extractDEXFiles(zip),
        this.extractManifest(zip),
        this.extractResources(zip),
        this.extractNativeLibraries(zip),
      ])

      // Parse manifest for basic info (simplified - real parsing requires binary XML parser)
      let packageName = this.extractPackageName(manifest)
      let versionCode = this.extractVersionCode(manifest)
      let versionName = this.extractVersionName(manifest)
      let applicationLabel = this.extractApplicationLabel(manifest, resources)

      // If manifest parsing failed (binary XML), try to extract from DEX files or use fallbacks
      if (!packageName && dexFiles.length > 0) {
        // Try to extract package name from DEX file (simplified - just use a hash of first DEX)
        const firstDex = new Uint8Array(dexFiles[0].slice(0, 100))
        const hash = Array.from(firstDex.slice(0, 8))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
        packageName = `app.${hash.substring(0, 12)}`
        console.log('Using fallback package name from DEX hash')
      }

      // Use filename as app label if we can't extract it
      if (!applicationLabel) {
        if (fileName) {
          // Try to extract app name from filename (remove .apk extension and format)
          const nameWithoutExt = fileName.replace(/\.apk$/i, '')
          applicationLabel = this.formatFileName(nameWithoutExt)
        } else {
          applicationLabel = packageName ? this.formatPackageName(packageName) : 'Unknown App'
        }
      }

      const apkInfo: APKInfo = {
        packageName: packageName || 'unknown',
        versionCode: versionCode || 1,
        versionName: versionName || '1.0',
        minSdkVersion: 21, // Default
        targetSdkVersion: 33, // Default
        applicationLabel: applicationLabel || 'Unknown App',
        dexFiles,
        resources,
        nativeLibraries,
        manifest,
      }

      // Cache the result
      APKParser.cache.set(cacheKey, apkInfo)
      
      // Limit cache size to prevent memory issues
      if (APKParser.cache.size > 10) {
        const firstKey = APKParser.cache.keys().next().value
        if (firstKey) {
          APKParser.cache.delete(firstKey)
        }
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
            .then(arrayBuffer => {
              dexFiles.push(arrayBuffer)
            })
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
        // Try to read as string first (for uncompressed manifests)
        const text = await manifestFile.async('string')
        // Check if it's actually readable XML (not binary)
        if (text.includes('<?xml') || text.includes('<manifest')) {
          return text
        }
        // If it's binary XML, we can't parse it directly without a binary XML parser
        // Return empty string and we'll use fallback methods
        console.warn('AndroidManifest.xml is in binary format, using fallback parsing')
        return ''
      } catch (e) {
        // If string conversion fails, it's likely binary XML
        console.warn('AndroidManifest.xml appears to be binary format:', e)
        return ''
      }
    }
    return ''
  }

  private async extractResources(zip: JSZip): Promise<Map<string, ArrayBuffer>> {
    const resources = new Map<string, ArrayBuffer>()
    const promises: Promise<void>[] = []

    for (const filename in zip.files) {
      const file = zip.files[filename]
      if (!file.dir && (filename.startsWith('res/') || filename.startsWith('assets/') || filename.endsWith('.so'))) {
        promises.push(
          file.async('arraybuffer')
            .then(arrayBuffer => {
              resources.set(filename, arrayBuffer)
            })
            .catch(e => console.warn('Failed to extract resource:', filename, e))
        )
      }
    }

    await Promise.all(promises)
    return resources
  }

  /**
   * Extract native libraries (.so files) from APK
   */
  async extractNativeLibraries(zip: JSZip): Promise<Map<string, ArrayBuffer>> {
    const libraries = new Map<string, ArrayBuffer>()
    const promises: Promise<void>[] = []

    // Check common library directories
    const libDirs = ['lib/armeabi-v7a/', 'lib/arm64-v8a/', 'lib/x86/', 'lib/x86_64/', 'lib/armeabi/']
    
    for (const libDir of libDirs) {
      for (const filename in zip.files) {
        const file = zip.files[filename]
        if (!file.dir && filename.startsWith(libDir) && filename.endsWith('.so')) {
          promises.push(
            file.async('arraybuffer')
              .then(arrayBuffer => {
                const libName = filename.substring(filename.lastIndexOf('/') + 1)
                libraries.set(libName, arrayBuffer)
                console.log('Found native library:', libName, 'Size:', arrayBuffer.byteLength)
              })
              .catch(e => console.warn('Failed to extract native library:', filename, e))
          )
        }
      }
    }

    await Promise.all(promises)
    return libraries
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

  private extractApplicationLabel(manifest: string, resources: Map<string, ArrayBuffer>): string | null {
    if (!manifest) return null
    
    // Try to extract android:label from manifest
    // Pattern: android:label="@string/app_name" or android:label="App Name"
    const labelMatch = manifest.match(/android:label=["']([^"']+)["']/)
    if (labelMatch) {
      const label = labelMatch[1]
      // If it's a resource reference (@string/app_name), try to resolve it
      if (label.startsWith('@string/')) {
        const stringName = label.replace('@string/', '')
        // Try to find in resources (simplified - would need proper resource parsing)
        // For now, format the string name nicely
        return this.formatStringName(stringName)
      }
      // If it's a direct string, return it
      return label
    }
    return null
  }

  private formatPackageName(packageName: string): string {
    // Convert package name like "com.example.app" to "App"
    const parts = packageName.split('.')
    const lastPart = parts[parts.length - 1]
    // Capitalize first letter
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1)
  }

  private formatStringName(stringName: string): string {
    // Convert "app_name" to "App Name"
    return stringName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  private formatFileName(fileName: string): string {
    // Convert filename like "my-awesome-app" or "MyAwesomeApp" to "My Awesome App"
    // Remove special characters and split by dashes/underscores/camelCase
    return fileName
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Split camelCase
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim() || 'Unknown App'
  }

  static async parseAPK(apkData: ArrayBuffer, fileName?: string): Promise<APKInfo> {
    const parser = new APKParser(apkData)
    return parser.parse(fileName)
  }

  static clearCache(): void {
    APKParser.cache.clear()
  }
}
