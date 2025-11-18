'use client'

import { useEffect, useState } from 'react'
import { statusTracker, StatusUpdate } from '@/lib/status-tracker'
import { CheckCircle2, AlertCircle, Info, Loader2, XCircle } from 'lucide-react'
import styles from './StatusDisplay.module.css'

interface StatusDisplayProps {
  className?: string
}

export function StatusDisplay({ className }: StatusDisplayProps) {
  const [currentStatus, setCurrentStatus] = useState<StatusUpdate | null>(null)
  const [recentStatuses, setRecentStatuses] = useState<StatusUpdate[]>([])

  useEffect(() => {
    const unsubscribe = statusTracker.subscribe((update) => {
      setCurrentStatus(update)
      setRecentStatuses((prev) => {
        const updated = [...prev, update]
        // Keep only last 5
        return updated.slice(-5)
      })
    })

    // Get initial status
    const initial = statusTracker.getCurrentStatus()
    if (initial) {
      setCurrentStatus(initial)
    }

    return unsubscribe
  }, [])

  if (!currentStatus) return null

  const getIcon = () => {
    switch (currentStatus.type) {
      case 'success':
        return <CheckCircle2 className={styles.icon} />
      case 'error':
        return <XCircle className={styles.icon} />
      case 'warning':
        return <AlertCircle className={styles.icon} />
      case 'progress':
        return <Loader2 className={`${styles.icon} ${styles.spinning}`} />
      default:
        return <Info className={styles.icon} />
    }
  }

  const getStatusColor = () => {
    switch (currentStatus.type) {
      case 'success':
        return styles.success
      case 'error':
        return styles.error
      case 'warning':
        return styles.warning
      case 'progress':
        return styles.progress
      default:
        return styles.info
    }
  }

  return (
    <div className={`${styles.statusDisplay} ${className || ''} ${getStatusColor()}`}>
      <div className={styles.currentStatus}>
        {getIcon()}
        <div className={styles.statusContent}>
          <div className={styles.statusMessage}>{currentStatus.message}</div>
          {currentStatus.details && (
            <div className={styles.statusDetails}>{currentStatus.details}</div>
          )}
          {currentStatus.progress !== undefined && (
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${currentStatus.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {recentStatuses.length > 1 && (
        <div className={styles.statusHistory}>
          {recentStatuses.slice(-3).map((status) => (
            <div key={status.id} className={styles.historyItem}>
              <span className={styles.historyMessage}>{status.message}</span>
              {status.progress !== undefined && (
                <span className={styles.historyProgress}>{status.progress}%</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

