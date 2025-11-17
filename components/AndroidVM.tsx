'use client'

import { useEffect, useRef, useState } from 'react'
import { useAndroidVM } from '@/lib/useAndroidVM'
import styles from './AndroidVM.module.css'

interface AndroidVMProps {
  vmState: 'stopped' | 'starting' | 'running' | 'error'
  setVmState: (state: 'stopped' | 'starting' | 'running' | 'error') => void
  apkFile: File | null
}

export function AndroidVM({ vmState, setVmState, apkFile }: AndroidVMProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { vm, initVM, startVM, installAPK, isReady } = useAndroidVM()

  useEffect(() => {
    if (canvasRef.current && !vm) {
      initVM(canvasRef.current)
    }
  }, [vm, initVM])

  useEffect(() => {
    if (vm && vmState === 'starting' && isReady) {
      startVM()
      setVmState('running')
    }
  }, [vm, vmState, isReady, startVM, setVmState])

  useEffect(() => {
    if (vm && apkFile && vmState === 'running') {
      installAPK(apkFile)
    }
  }, [vm, apkFile, vmState, installAPK])

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
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
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
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
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (vm && vmState === 'running') {
      e.preventDefault()
      vm.handleTouch(0, 0, 'end')
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (vm && vmState === 'running') {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        vm.handleTouch(x, y, 'start')
      }
    }
  }

  const handleMouseUp = () => {
    if (vm && vmState === 'running') {
      vm.handleTouch(0, 0, 'end')
    }
  }

  return (
    <div className={styles.container} ref={containerRef}>
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
                Click "Start VM" to launch the Android emulator
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
              <p className={styles.errorText}>Error starting VM. Please try again.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

