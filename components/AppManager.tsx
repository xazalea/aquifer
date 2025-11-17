'use client'

import { useState, useEffect } from 'react'
import { Trash2, Play, Package, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InstalledApp } from '@/lib/android-emulator'
import styles from './AppManager.module.css'

interface AppManagerProps {
  installedApps: InstalledApp[]
  onLaunchApp: (packageName: string) => void
  onUninstallApp: (packageName: string) => void
  runningAppPackage: string | null
}

export function AppManager({ 
  installedApps, 
  onLaunchApp, 
  onUninstallApp,
  runningAppPackage 
}: AppManagerProps) {
  const [selectedApp, setSelectedApp] = useState<string | null>(null)

  if (installedApps.length === 0) {
    return (
      <div className={styles.empty}>
        <Package className={styles.emptyIcon} />
        <p className={styles.emptyText}>No apps installed</p>
        <p className={styles.emptySubtext}>Install APKs to see them here</p>
      </div>
    )
  }

  return (
    <div className={styles.manager}>
      <h3 className={styles.title}>
        <Package className={styles.icon} />
        Installed Apps ({installedApps.length})
      </h3>
      <div className={styles.appsList}>
        {installedApps.map((app) => {
          const isRunning = app.packageName === runningAppPackage
          return (
            <div 
              key={app.packageName} 
              className={`${styles.appItem} ${isRunning ? styles.appItemRunning : ''}`}
              onClick={() => setSelectedApp(selectedApp === app.packageName ? null : app.packageName)}
            >
              <div className={styles.appHeader}>
                <div className={styles.appIcon}>
                  <Package className="w-5 h-5" />
                </div>
                <div className={styles.appDetails}>
                  <h4 className={styles.appName}>{app.label || app.packageName}</h4>
                  <p className={styles.appPackage}>{app.packageName}</p>
                  <p className={styles.appVersion}>v{app.versionName}</p>
                </div>
                {isRunning && (
                  <span className={styles.runningBadge}>Running</span>
                )}
              </div>
              
              {selectedApp === app.packageName && (
                <div className={styles.appActions}>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      onLaunchApp(app.packageName)
                    }}
                    disabled={isRunning}
                    size="sm"
                    className={styles.actionButton}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isRunning ? 'Running' : 'Launch'}
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Uninstall ${app.label || app.packageName}?`)) {
                        onUninstallApp(app.packageName)
                      }
                    }}
                    variant="destructive"
                    size="sm"
                    className={styles.actionButton}
                    disabled={isRunning}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Uninstall
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

