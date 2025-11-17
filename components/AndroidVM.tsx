'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAndroidVM } from '@/lib/useAndroidVM'
import styles from './AndroidVM.module.css'

interface AndroidVMProps {
  vmState: 'stopped' | 'starting' | 'running' | 'error'
  setVmState: (state: 'stopped' | 'starting' | 'running' | 'error') => void
  apkFile: File | null
  onError?: (error: string | null) => void
  onInstallingChange?: (isInstalling: boolean) => void
}

export function AndroidVM({ vmState, setVmState, apkFile, onError, onInstallingChange }: AndroidVMProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const installedApkRef = useRef<string | null>(null) // Track installed APK to prevent re-installation
  const { vm, initVM, startVM, installAPK, isReady, error, isInstalling } = useAndroidVM()

  useEffect(() => {
    if (onError) {
      onError(error)
    }
  }, [error, onError])

  useEffect(() => {
    if (onInstallingChange) {
      onInstallingChange(isInstalling)
    }
  }, [isInstalling, onInstallingChange])

  useEffect(() => {
    if (canvasRef.current && !vm) {
      initVM(canvasRef.current)
    }
  }, [vm, initVM])

  useEffect(() => {
    if (error) {
      setVmState('error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  useEffect(() => {
    if (vm && vmState === 'starting' && isReady) {
      try {
        startVM()
        setVmState('running')
      } catch (err) {
        console.error('Failed to start VM:', err)
        setVmState('error')
      }
    }
  }, [vm, vmState, isReady, startVM, setVmState])

  // Reset installed APK ref when VM stops or APK file is cleared
  useEffect(() => {
    if (vmState === 'stopped' || !apkFile) {
      installedApkRef.current = null
    }
  }, [vmState, apkFile])

  useEffect(() => {
    // Only install if:
    // 1. VM is running
    // 2. APK file exists
    // 3. Not currently installing
    // 4. This APK hasn't been installed yet (check by name + size to handle same file re-uploads)
    if (vm && apkFile && vmState === 'running' && !isInstalling) {
      const apkKey = `${apkFile.name}-${apkFile.size}`
      
      // Skip if this exact APK was already installed
      if (installedApkRef.current === apkKey) {
        return
      }

      // Mark as installing to prevent re-entry
      installedApkRef.current = apkKey
      
      installAPK(apkFile)
        .then(() => {
          console.log('APK installed successfully')
        })
        .catch((err) => {
          console.error('APK installation failed:', err)
          // Reset on error so user can retry
          installedApkRef.current = null
          setVmState('error')
        })
    }
  }, [vm, apkFile, vmState, installAPK, isInstalling])

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (vm && vmState === 'running') {
      e.preventDefault()
      const touch = e.touches[0]
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const x = touch.clientX - rect.left
        const y = touch.clientY - rect.top
        vm.handleTouch(x, y, 'start')
      }
    }
  }, [vm, vmState])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (vm && vmState === 'running') {
      e.preventDefault()
      const touch = e.touches[0]
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const x = touch.clientX - rect.left
        const y = touch.clientY - rect.top
        vm.handleTouch(x, y, 'move')
      }
    }
  }, [vm, vmState])

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (vm && vmState === 'running') {
      e.preventDefault()
      vm.handleTouch(0, 0, 'end')
    }
  }, [vm, vmState])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (vm && vmState === 'running') {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        vm.handleTouch(x, y, 'start')
      }
    }
  }, [vm, vmState])

  const handleMouseUp = useCallback(() => {
    if (vm && vmState === 'running') {
      vm.handleTouch(0, 0, 'end')
    }
  }, [vm, vmState])

  return (
    <div className={`${styles.container} relative`} ref={containerRef}>
      <div className={styles.vmWrapper}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          width={800}
          height={600}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
        />
        {vmState === 'stopped' && (
          <div className={styles.placeholder}>
            <div className={styles.placeholderContent}>
              <h2 className={styles.placeholderTitle}>Android VM</h2>
              <p className={styles.placeholderText}>
                Click &quot;Start VM&quot; to launch the Android emulator
              </p>
            </div>
          </div>
        )}
        {vmState === 'starting' && (
          <div className={styles.placeholder}>
            <div className={styles.placeholderContent}>
              <div className={styles.loader}></div>
              <p className={styles.placeholderText}>Initializing Android VM...</p>
            </div>
          </div>
        )}
        {vmState === 'error' && (
          <div className={styles.placeholder}>
            <div className={styles.placeholderContent}>
              <p className={styles.errorText}>
                {error || 'Error starting VM. Please try again.'}
              </p>
              <button
                className={styles.retryButton}
                onClick={() => setVmState('stopped')}
              >
                Retry
              </button>
            </div>
          </div>
        )}
        {isInstalling && vmState === 'running' && (
          <div className={styles.installingOverlay}>
            <div className={styles.installingContent}>
              <div className={styles.loader}></div>
              <p>Installing APK...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
