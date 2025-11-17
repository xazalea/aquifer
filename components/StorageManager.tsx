'use client'

import { useState, useEffect } from 'react'
import { Database, Trash2, HardDrive, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { appStorage } from '@/lib/app-storage'
import styles from './StorageManager.module.css'

export function StorageManager() {
  const [storageSize, setStorageSize] = useState<number>(0)
  const [appCount, setAppCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadStorageInfo()
  }, [])

  const loadStorageInfo = async () => {
    try {
      const size = await appStorage.getStorageSize()
      const apps = await appStorage.getAllApps()
      setStorageSize(size)
      setAppCount(apps.length)
    } catch (error) {
      console.error('Failed to load storage info:', error)
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const handleClearStorage = async () => {
    if (!confirm('Are you sure you want to clear all stored apps and data? This cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      await appStorage.clearAll()
      await loadStorageInfo()
      alert('Storage cleared successfully')
    } catch (error) {
      console.error('Failed to clear storage:', error)
      alert('Failed to clear storage')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.manager}>
      <div className={styles.header}>
        <Database className={styles.icon} />
        <h3 className={styles.title}>Storage Management</h3>
      </div>
      
      <div className={styles.stats}>
        <div className={styles.stat}>
          <HardDrive className={styles.statIcon} />
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Storage Used</span>
            <span className={styles.statValue}>{formatSize(storageSize)}</span>
          </div>
        </div>
        
        <div className={styles.stat}>
          <Download className={styles.statIcon} />
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Installed Apps</span>
            <span className={styles.statValue}>{appCount}</span>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          onClick={handleClearStorage}
          disabled={isLoading || appCount === 0}
          variant="destructive"
          className={styles.clearButton}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {isLoading ? 'Clearing...' : 'Clear All Storage'}
        </Button>
      </div>

      <div className={styles.info}>
        <p className={styles.infoText}>
          Apps and APK files are stored locally in your browser using IndexedDB.
          This allows offline access and faster app loading.
        </p>
      </div>
    </div>
  )
}

