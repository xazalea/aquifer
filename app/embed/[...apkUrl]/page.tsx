'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import styles from './EmbedPage.module.css'
import { HybridEmulator } from '@/lib/hybrid-emulator'
import { EmbedVNCViewer } from '@/components/EmbedVNCViewer'
import { StatusDisplay } from '@/components/StatusDisplay'
import { statusTracker } from '@/lib/status-tracker'

export default function EmbedPage() {
  const params = useParams()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [emulator, setEmulator] = useState<HybridEmulator | null>(null)
  const [apkUrl, setApkUrl] = useState<string | null>(null)
  const [vncUrl, setVncUrl] = useState<string | null>(null)

  // Extract APK URL from route params
  useEffect(() => {
    if (params.apkUrl) {
      // Handle array of path segments (Next.js catch-all route)
      const urlParts = Array.isArray(params.apkUrl) ? params.apkUrl : [params.apkUrl]
      
      // Decode each part and join
      let decodedUrl = urlParts
        .map(part => {
          try {
            return decodeURIComponent(part as string)
          } catch {
            return part as string
          }
        })
        .join('/')
      
      // Handle different URL formats
      // Try to decode again in case of double encoding
      try {
        decodedUrl = decodeURIComponent(decodedUrl)
      } catch {
        // Already decoded or invalid, use as-is
      }
      
      // Ensure it's a valid URL
      let finalUrl = decodedUrl
      if (!decodedUrl.startsWith('http://') && !decodedUrl.startsWith('https://')) {
        // Add https:// if missing
        finalUrl = `https://${decodedUrl}`
      }
      
      // Validate URL format
      try {
        new URL(finalUrl)
        setApkUrl(finalUrl)
        console.log('📦 APK URL:', finalUrl)
      } catch (urlError) {
        console.error('❌ Invalid APK URL:', finalUrl)
        setError('Invalid APK URL format. Please provide a valid HTTP/HTTPS URL.')
        setIsLoading(false)
      }
    }
  }, [params])

  // Initialize emulator and load APK
  useEffect(() => {
    if (!canvasRef.current || !apkUrl) return

    let mounted = true
    const initEmulator = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setLoadingProgress(10)

        // Create hybrid emulator (will use optimized Android VM)
        const hybrid = new HybridEmulator(canvasRef.current!, {
          mode: 'webvm-emuhub', // Use fastest method
        })

        setLoadingProgress(30)
        console.log('🚀 Initializing emulator...')

        // Initialize emulator
        const initialized = await hybrid.init()
        if (!mounted) return

        if (!initialized) {
          throw new Error('Failed to initialize emulator')
        }

        setLoadingProgress(50)
        console.log('✅ Emulator initialized')

        // Wait for VNC URL (if using WebVM/EmuHub)
        setLoadingProgress(60)
        const vnc = await hybrid.waitForVNCUrl(30000) // 30 second timeout
        if (vnc) {
          console.log('📺 VNC URL:', vnc)
          setVncUrl(vnc)
        } else {
          // Try to get VNC URL directly
          const directVnc = hybrid.getVNCUrl()
          if (directVnc) {
            setVncUrl(directVnc)
          }
        }

        setLoadingProgress(70)
        setEmulator(hybrid)

        // Download and install APK
        setLoadingProgress(80)
        console.log('📥 Downloading APK from:', apkUrl)

        try {
          const response = await fetch(apkUrl)
          if (!response.ok) {
            throw new Error(`Failed to download APK: ${response.statusText}`)
          }

          const apkData = await response.arrayBuffer()
          const fileName = apkUrl.split('/').pop() || 'app.apk'

          setLoadingProgress(90)
          console.log('📦 Installing APK...')

          // Install APK
          await hybrid.installAPK(apkData, fileName)

          setLoadingProgress(100)
          console.log('✅ APK installed successfully')

          // Small delay to ensure everything is ready
          await new Promise(resolve => setTimeout(resolve, 1000))

          setIsLoading(false)
        } catch (apkError) {
          console.error('❌ APK download/install failed:', apkError)
          setError(`Failed to load APK: ${apkError instanceof Error ? apkError.message : 'Unknown error'}`)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('❌ Emulator initialization failed:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize emulator')
          setIsLoading(false)
        }
      }
    }

    initEmulator()

    return () => {
      mounted = false
      if (emulator) {
        emulator.stop().catch(console.error)
      }
    }
  }, [apkUrl])

  // Fullscreen handling - auto-enter fullscreen for embed mode
  useEffect(() => {
    if (!isLoading && !error && containerRef.current) {
      // Try to enter fullscreen (may require user interaction in some browsers)
      const enterFullscreen = async () => {
        try {
          if (containerRef.current && !document.fullscreenElement) {
            await containerRef.current.requestFullscreen()
          }
        } catch (err) {
          // Fullscreen may require user interaction, that's okay
          console.log('Fullscreen requires user interaction')
        }
      }
      
      // Small delay to ensure page is ready
      setTimeout(enterFullscreen, 500)
    }
  }, [isLoading, error])

  return (
    <div className={styles.embedContainer} ref={containerRef}>
      {isLoading && (
        <div className={styles.loadingScreen}>
          <div className={styles.logoContainer}>
            <div className={styles.logo}>aquifer.</div>
            <div className={styles.tagline}>Android in your browser</div>
          </div>
          
          <div className={styles.loadingBarContainer}>
            <div 
              className={styles.loadingBar}
              style={{ width: `${loadingProgress}%` }}
            />
            <div className={styles.loadingText}>
              {/* Status is shown in StatusDisplay below */}
            </div>
          </div>
          
          {/* Real-time status display */}
          <div className={styles.statusContainer}>
            <StatusDisplay />
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorScreen}>
          <div className={styles.logoContainer}>
            <div className={styles.logo}>aquifer.</div>
          </div>
          <div className={styles.errorMessage}>{error}</div>
          <div className={styles.errorHint}>
            Make sure the APK URL is accessible and valid
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <>
          {vncUrl ? (
            <EmbedVNCViewer vncUrl={vncUrl} />
          ) : (
            <canvas
              ref={canvasRef}
              className={styles.canvas}
            />
          )}
        </>
      )}
    </div>
  )
}

