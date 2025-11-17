'use client'

import { useState, useRef } from 'react'
import { Play, Square, Upload, Power, File, AlertCircle } from 'lucide-react'
import styles from './ControlPanel.module.css'

interface ControlPanelProps {
  vmState: 'stopped' | 'starting' | 'running' | 'error'
  setVmState: (state: 'stopped' | 'starting' | 'running' | 'error') => void
  apkFile: File | null
  setApkFile: (file: File | null) => void
  error?: string | null
  isInstalling?: boolean
}

export function ControlPanel({ 
  vmState, 
  setVmState, 
  apkFile, 
  setApkFile,
  error,
  isInstalling = false
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

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      setUploadError(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`)
      return
    }

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
          <button
            onClick={handleStart}
            disabled={vmState === 'starting' || vmState === 'running'}
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            <Play className={styles.buttonIcon} />
            Start VM
          </button>
          <button
            onClick={handleStop}
            disabled={vmState === 'stopped'}
            className={`${styles.button} ${styles.buttonDanger}`}
          >
            <Square className={styles.buttonIcon} />
            Stop VM
          </button>
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
        <button
          onClick={handleUploadClick}
          disabled={vmState !== 'running' || isInstalling}
          className={`${styles.button} ${styles.buttonSecondary}`}
        >
          <File className={styles.buttonIcon} />
          {isInstalling ? 'Installing...' : 'Select APK'}
        </button>
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

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Information</h3>
        <div className={styles.info}>
          <p className={styles.infoText}>
            Aquifer runs Android OS directly in your browser using WebAssembly
            and JavaScript emulation.
          </p>
          <p className={styles.infoText}>
            Start the VM, then upload and install APK files to run Android apps.
          </p>
        </div>
      </div>
    </div>
  )
}
