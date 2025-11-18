'use client'

import { useEffect, useRef, useState } from 'react'
import { EmuHubVNCViewer } from './EmuHubVNCViewer'
import styles from './EmbedVNCViewer.module.css'

interface EmbedVNCViewerProps {
  vncUrl: string | null
  canvas?: HTMLCanvasElement | null
}

export function EmbedVNCViewer({ vncUrl, canvas }: EmbedVNCViewerProps) {
  // Use the existing EmuHubVNCViewer component for consistency
  // It handles VNC display properly
  if (vncUrl) {
    return (
      <div className={styles.container}>
        <EmuHubVNCViewer 
          vncUrl={vncUrl}
        />
      </div>
    )
  }

  // Fallback to canvas if no VNC URL
  if (canvas) {
    return (
      <div className={styles.container}>
        <canvas
          ref={(node) => {
            if (node && canvas) {
              // Copy canvas content periodically
              const updateCanvas = () => {
                const ctx = node.getContext('2d')
                if (ctx && canvas.width > 0 && canvas.height > 0) {
                  node.width = canvas.width
                  node.height = canvas.height
                  ctx.drawImage(canvas, 0, 0)
                }
              }
              const interval = setInterval(updateCanvas, 100)
              updateCanvas()
              return () => clearInterval(interval)
            }
          }}
          className={styles.canvas}
        />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.connecting}>
        <div className={styles.spinner} />
        <div className={styles.connectingText}>Initializing Android...</div>
      </div>
    </div>
  )
}

