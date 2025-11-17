'use client'

import { useState, useRef } from 'react'
import { Play, Square, Upload, Power, File, AlertCircle } from 'lucide-react'
import { RainbowButton } from '@/components/ui/rainbow-button'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { RippleButton } from '@/components/ui/ripple-button'
import { BorderBeam } from '@/components/ui/border-beam'
import { NumberTicker } from '@/components/ui/number-ticker'
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
    <div className={`${styles.panel} relative overflow-hidden`}>
      <BorderBeam size={250} duration={12} delay={9} />
      <div className="relative z-10">
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <Power className={styles.icon} />
            VM Controls
          </h3>
          <div className={styles.buttonGroup}>
            <RainbowButton
              onClick={handleStart}
              disabled={vmState === 'starting' || vmState === 'running'}
              size="sm"
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              Start VM
            </RainbowButton>
            <RippleButton
              onClick={handleStop}
              disabled={vmState === 'stopped'}
              rippleColor="#ef4444"
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop VM
            </RippleButton>
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
          <ShimmerButton
            onClick={handleUploadClick}
            disabled={vmState !== 'running' || isInstalling}
            className="w-full"
            shimmerColor="#667eea"
          >
            <File className="w-4 h-4 mr-2" />
            {isInstalling ? 'Installing...' : 'Select APK'}
          </ShimmerButton>
          {apkFile && (
            <div className={styles.fileInfo}>
              <p className={styles.fileName}>{apkFile.name}</p>
              <p className={styles.fileSize}>
                <NumberTicker value={Math.round(apkFile.size / 1024 / 1024 * 100) / 100} /> MB
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
    </div>
  )
}
