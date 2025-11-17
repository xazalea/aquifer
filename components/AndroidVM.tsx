'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAndroidVM } from '@/lib/useAndroidVM'
import { BorderBeam } from '@/components/ui/border-beam'
import { Particles } from '@/components/ui/particles'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'
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

  useEffect(() => {
    if (vm && apkFile && vmState === 'running' && !isInstalling) {
      installAPK(apkFile).catch((err) => {
        console.error('APK installation failed:', err)
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
      {vmState === 'running' && (
        <>
          <BorderBeam size={250} duration={12} delay={9} />
          <Particles
            className="absolute inset-0"
            quantity={50}
            ease={80}
            color="#667eea"
            refresh
          />
        </>
      )}
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
              <AnimatedGradientText>
                <span className="text-4xl font-bold">Android VM</span>
              </AnimatedGradientText>
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
