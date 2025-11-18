/**
 * EmuHub VNC Viewer Component
 * 
 * Displays the Android emulator from EmuHub via NoVNC
 * This is used when WebVM + EmuHub mode is active
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './EmuHubVNCViewer.module.css'

interface EmuHubVNCViewerProps {
  vncUrl: string | null
  width?: number
  height?: number
}

export function EmuHubVNCViewer({ vncUrl, width = 800, height = 600 }: EmuHubVNCViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vncUrl) {
      setError('No VNC URL provided')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    // NoVNC will load in the iframe
    // The URL should point to the NoVNC client with the VNC connection
    const iframe = iframeRef.current
    if (iframe) {
      iframe.onload = () => {
        setIsLoading(false)
      }
      iframe.onerror = () => {
        setError('Failed to load VNC viewer')
        setIsLoading(false)
      }
    }
  }, [vncUrl])

  if (!vncUrl) {
    return (
      <div className={styles.container}>
        <div className={styles.placeholder}>
          <p>No emulator available. Please start an emulator first.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {isLoading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Connecting to Android emulator...</p>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={vncUrl}
        width={width}
        height={height}
        className={styles.vncFrame}
        allow="clipboard-read; clipboard-write"
        title="Android Emulator VNC"
      />
    </div>
  )
}

