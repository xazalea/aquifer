/**
 * APK Parser - Extracts and parses Android APK files
 * 
 * APK files are ZIP archives containing:
 * - classes.dex: Dalvik bytecode
 * - AndroidManifest.xml: App metadata
 * - resources.arsc: Compiled resources
 * - res/: Resource files
 * - META-INF/: Signing information
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

  constructor(apkData: ArrayBuffer) {
    this.apkData = apkData
  }

  async parse(): Promise<APKInfo> {
    const zip = await JSZip.loadAsync(this.apkData)
    
    // Extract DEX files
    const dexFiles: ArrayBuffer[] = []
    for (const filename in zip.files) {
      const file = zip.files[filename]
      if (!file.dir && filename.endsWith('.dex')) {
        try {
          const arrayBuffer = await file.async('arraybuffer')
          dexFiles.push(arrayBuffer)
        } catch (e) {
          console.warn('Failed to extract DEX file:', filename, e)
        }
      }
    }

    // Extract AndroidManifest.xml
    let manifest = ''
    const manifestFile = zip.files['AndroidManifest.xml']
    if (manifestFile) {
      manifest = await manifestFile.async('string')
    }

    // Extract resources
    const resources = new Map<string, ArrayBuffer>()
    for (const filename in zip.files) {
      const file = zip.files[filename]
      if (!file.dir && (filename.startsWith('res/') || filename.startsWith('assets/'))) {
        try {
          const arrayBuffer = await file.async('arraybuffer')
          resources.set(filename, arrayBuffer)
        } catch (e) {
          console.warn('Failed to extract resource:', filename, e)
        }
      }
    }

    // Parse manifest for basic info (simplified - real parsing requires binary XML parser)
    const packageName = this.extractPackageName(manifest)
    const versionCode = this.extractVersionCode(manifest)
    const versionName = this.extractVersionName(manifest)

    return {
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
  }

  private extractPackageName(manifest: string): string | null {
    const match = manifest.match(/package=["']([^"']+)["']/)
    return match ? match[1] : null
  }

  private extractVersionCode(manifest: string): number | null {
    const match = manifest.match(/versionCode=["'](\d+)["']/)
    return match ? parseInt(match[1], 10) : null
  }

  private extractVersionName(manifest: string): string | null {
    const match = manifest.match(/versionName=["']([^"']+)["']/)
    return match ? match[1] : null
  }

  static async parseAPK(apkData: ArrayBuffer): Promise<APKInfo> {
    const parser = new APKParser(apkData)
    return parser.parse()
  }
}

