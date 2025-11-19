'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useAndroidVM } from '@/lib/useAndroidVM'
import { EmuHubVNCViewer } from './EmuHubVNCViewer'
import { EmulationMode } from './EmulationModeSelector'
import { HybridEmulator } from '@/lib/hybrid-emulator'
import { OptimizedRenderer } from '@/lib/optimized-renderer'
import { performanceOptimizer } from '@/lib/performance-optimizer'
import styles from './AndroidVM.module.css'

interface AndroidVMProps {
  vmState: 'stopped' | 'starting' | 'running' | 'error'
  setVmState: (state: 'stopped' | 'starting' | 'running' | 'error') => void
  apkFile: File | null
  onError?: (error: string | null) => void
  onInstallingChange?: (isInstalling: boolean) => void
  emulationMode?: EmulationMode
}

export function AndroidVM({ vmState, setVmState, apkFile, onError, onInstallingChange, emulationMode = 'auto' }: AndroidVMProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const installedApkRef = useRef<string | null>(null) // Track installed APK to prevent re-installation
  const hybridEmulatorRef = useRef<HybridEmulator | null>(null)
  const optimizedRendererRef = useRef<OptimizedRenderer | null>(null)
  const [vncUrl, setVncUrl] = useState<string | null>(null)
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

  // Initialize hybrid emulator for WebVM + EmuHub mode
  useEffect(() => {
    if (emulationMode === 'webvm-emuhub' && canvasRef.current) {
      // Clean up browser VM if switching to WebVM+EmuHub
      if (vm) {
        console.log('Switching from browser to WebVM+EmuHub mode')
      }
      
      // Clean up previous hybrid emulator if switching modes
      if (hybridEmulatorRef.current) {
        hybridEmulatorRef.current.stop().catch(console.error)
        hybridEmulatorRef.current = null
        setVncUrl(null)
      }
      
      // Create new hybrid emulator
      const hybrid = new HybridEmulator(canvasRef.current, { mode: 'webvm-emuhub' })
      hybridEmulatorRef.current = hybrid
      hybrid.init().then(async (success) => {
        if (success) {
          // Update VM state
          if (vmState === 'stopped') {
            setVmState('running')
          }
          
          // Wait for VNC URL to be available
          console.log('⏳ Waiting for VNC URL...')
          const vnc = await hybrid.waitForVNCUrl(60000) // Wait up to 60 seconds
          
          if (vnc) {
            setVncUrl(vnc)
            console.log('✅ WebVM + EmuHub ready, VNC URL:', vnc)
          } else {
            console.warn('⚠️ VNC URL not available yet, but EmuHub is initialized')
            // Still show the viewer, it will show loading state
          }
        } else {
          console.warn('⚠️ WebVM + EmuHub initialization failed, falling back to browser mode')
          // Don't set error state, just fall back silently
        }
      }).catch((error) => {
        console.error('❌ WebVM + EmuHub initialization error:', error)
        // Don't set error state, fall back gracefully
      })
    } else if (emulationMode !== 'webvm-emuhub' && hybridEmulatorRef.current) {
      // Clean up hybrid emulator when switching away from webvm-emuhub
      hybridEmulatorRef.current.stop().catch(console.error)
      hybridEmulatorRef.current = null
      setVncUrl(null)
    }
  }, [emulationMode, vm, vmState, setVmState])

  // Initialize browser VM for browser mode or auto mode
  useEffect(() => {
    if ((emulationMode === 'browser' || emulationMode === 'auto') && canvasRef.current) {
      // Clean up WebVM+EmuHub if switching to browser mode
      if (hybridEmulatorRef.current && emulationMode === 'browser') {
        hybridEmulatorRef.current.stop().catch(console.error)
        hybridEmulatorRef.current = null
        setVncUrl(null)
      }
      
      // Initialize browser VM with the correct mode
      if (!vm) {
        initVM(canvasRef.current, emulationMode)
      }
    }
  }, [vm, initVM, emulationMode])

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

  // Show VNC viewer for WebVM + EmuHub mode
  if (emulationMode === 'webvm-emuhub') {
    return (
      <div className={`${styles.container} relative`} ref={containerRef}>
        <div className={styles.vmWrapper}>
          <EmuHubVNCViewer vncUrl={vncUrl} />
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.container} relative`} ref={containerRef}>
          <div className={styles.vmWrapper}>
            <canvas
              ref={canvasRef}
              className={styles.canvas}
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
            </div>
          </div>
        )}
        {vmState === 'error' && (
          <div className={styles.placeholder}>
            <div className={styles.placeholderContent}>
              <p className={styles.errorText}>
                {error || 'Error starting VM. Please try again.'}
              </p>
              {error && error.includes('Docker/WebVM') && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground mb-3">
                    Docker/WebVM initialization failed. You can manually switch to browser mode to run apps.
                  </p>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    onClick={() => {
                      // Switch to browser mode via custom event
                      const event = new CustomEvent('switch-emulation-mode', { detail: 'browser' })
                      window.dispatchEvent(event)
                      setVmState('stopped')
                      if (onError) {
                        onError(null) // Clear error when switching modes
                      }
                    }}
                  >
                    Switch to Browser Mode
                  </button>
                </div>
              )}
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
