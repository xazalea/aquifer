'use client'

import { useState, useRef, useCallback } from 'react'
import { AndroidEmulator } from './android-emulator'

interface VMInstance {
  canvas: HTMLCanvasElement
  emulator: AndroidEmulator | null
}

export function useAndroidVM() {
  const [vm, setVm] = useState<VMInstance | null>(null)
  const [isReady, setIsReady] = useState(false)

  const initVM = useCallback((canvas: HTMLCanvasElement) => {
    try {
      const emulator = new AndroidEmulator(canvas)
      setVm({ canvas, emulator })
      
      // Simulate initialization delay
      setTimeout(() => {
        setIsReady(true)
      }, 1000)
    } catch (error) {
      console.error('Failed to initialize VM:', error)
      setIsReady(false)
    }
  }, [])

  const startVM = useCallback(() => {
    if (vm?.emulator) {
      vm.emulator.start()
    }
  }, [vm])

  const installAPK = useCallback(async (file: File) => {
    if (!vm?.emulator) {
      console.error('VM not initialized')
      return
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      await vm.emulator.installAPK(arrayBuffer)
      console.log('APK installed successfully')
    } catch (error) {
      console.error('Failed to install APK:', error)
    }
  }, [vm])

  return {
    vm: vm?.emulator || null,
    initVM,
    startVM,
    installAPK,
    isReady,
  }
}

