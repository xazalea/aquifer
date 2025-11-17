'use client'

import { useState, useRef } from 'react'
import { Play, Square, Upload, Power, File } from 'lucide-react'
import styles from './ControlPanel.module.css'

interface ControlPanelProps {
  vmState: 'stopped' | 'starting' | 'running' | 'error'
  setVmState: (state: 'stopped' | 'starting' | 'running' | 'error') => void
  apkFile: File | null
  setApkFile: (file: File | null) => void
}

export function ControlPanel({ vmState, setVmState, apkFile, setApkFile }: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleStart = () => {
    if (vmState === 'stopped' || vmState === 'error') {
      setVmState('starting')
    }
  }

  const handleStop = () => {
    setVmState('stopped')
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.name.endsWith('.apk')) {
      setApkFile(file)
    } else {
      alert('Please select a valid APK file')
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

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
          disabled={vmState !== 'running'}
          className={`${styles.button} ${styles.buttonSecondary}`}
        >
          <File className={styles.buttonIcon} />
          Select APK
        </button>
        {apkFile && (
          <div className={styles.fileInfo}>
            <p className={styles.fileName}>{apkFile.name}</p>
            <p className={styles.fileSize}>
              {(apkFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
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

