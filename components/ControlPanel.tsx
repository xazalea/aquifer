'use client'

import { useState, useRef } from 'react'
import { Play, Square, Upload, Power, File, AlertCircle, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppManager } from '@/components/AppManager'
import { StorageManager } from '@/components/StorageManager'
import { EmulationModeSelector, EmulationMode } from '@/components/EmulationModeSelector'
import { InstalledApp } from '@/lib/android-emulator'
import styles from './ControlPanel.module.css'

interface ControlPanelProps {
  vmState: 'stopped' | 'starting' | 'running' | 'error'
  setVmState: (state: 'stopped' | 'starting' | 'running' | 'error') => void
  apkFile: File | null
  setApkFile: (file: File | null) => void
  error?: string | null
  isInstalling?: boolean
  installedApps?: InstalledApp[]
  onLaunchApp?: (packageName: string) => void
  onUninstallApp?: (packageName: string) => void
  runningAppPackage?: string | null
  emulationMode?: EmulationMode
  onEmulationModeChange?: (mode: EmulationMode) => void
}

export function ControlPanel({ 
      vmState, 
      setVmState, 
      apkFile, 
      setApkFile,
      error,
      isInstalling = false,
      installedApps = [],
      onLaunchApp,
      onUninstallApp,
      runningAppPackage = null,
      emulationMode = 'auto',
      onEmulationModeChange
    }: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleStart = () => {
    if (vmState === 'stopped' || vmState === 'error') {
      setUploadError(null)
      setVmState('starting')
    }
  }

  const handleStop = () => {
    setVmState('stopped')
    setApkFile(null)
    setUploadError(null)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setUploadError(null)
    
    if (!file) {
      return
    }

    if (!file.name.endsWith('.apk')) {
      setUploadError('Please select a valid APK file')
      return
    }

    // No file size limit - allow any size APK
    setApkFile(file)
  }

  const handleUploadClick = () => {
    if (vmState !== 'running') {
      setUploadError('Please start the VM first')
      return
    }
    fileInputRef.current?.click()
  }

  const displayError = error || uploadError

  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Power className={styles.icon} />
          VM Controls
        </h3>
        <div className={styles.buttonGroup}>
          <Button
            onClick={handleStart}
            disabled={vmState === 'starting' || vmState === 'running'}
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-2" />
            Start VM
          </Button>
          <Button
            onClick={handleStop}
            disabled={vmState === 'stopped'}
            variant="destructive"
            className="flex-1"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop VM
          </Button>
        </div>
        <div className={styles.status}>
          <span className={styles.statusLabel}>Status:</span>
          <span className={`${styles.statusValue} ${styles[`status${vmState.charAt(0).toUpperCase() + vmState.slice(1)}`]}`}>
            {vmState}
          </span>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Upload className={styles.icon} />
          APK Installer
        </h3>
        <input
          ref={fileInputRef}
          type="file"
          accept=".apk"
          onChange={handleFileSelect}
          className={styles.fileInput}
        />
        <Button
          onClick={handleUploadClick}
          disabled={vmState !== 'running' || isInstalling}
          className="w-full"
        >
          <File className="w-4 h-4 mr-2" />
          {isInstalling ? 'Installing...' : 'Select APK'}
        </Button>
        {apkFile && (
          <div className={styles.fileInfo}>
            <p className={styles.fileName}>{apkFile.name}</p>
            <p className={styles.fileSize}>
              {(apkFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}
        {displayError && (
          <div className={styles.errorBox}>
            <AlertCircle className={styles.errorIcon} />
            <p className={styles.errorText}>{displayError}</p>
          </div>
        )}
      </div>

      {vmState === 'running' && installedApps.length > 0 && (
        <div className={styles.section}>
          <AppManager
            installedApps={installedApps}
            onLaunchApp={onLaunchApp || (() => {})}
            onUninstallApp={onUninstallApp || (() => {})}
            runningAppPackage={runningAppPackage}
          />
        </div>
      )}

          <div className={styles.section}>
            <StorageManager />
          </div>

          {onEmulationModeChange && (
            <div className={styles.section}>
              <EmulationModeSelector
                currentMode={emulationMode}
                onModeChange={onEmulationModeChange}
              />
            </div>
          )}

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Information</h3>
        <div className={styles.info}>
          <p className={styles.infoText}>
            Aquifer runs Android OS directly in your browser using WebAssembly
            and JavaScript emulation. Install as a PWA for offline access.
          </p>
          <p className={styles.infoText}>
            Start the VM, then upload and install APK files to run Android apps.
            Apps are stored locally for faster loading.
          </p>
        </div>
      </div>
    </div>
  )
}
