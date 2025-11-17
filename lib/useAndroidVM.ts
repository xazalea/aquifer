'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { AndroidEmulator } from './android-emulator'

interface VMInstance {
  canvas: HTMLCanvasElement
  emulator: AndroidEmulator | null
}

export function useAndroidVM() {
  const [vm, setVm] = useState<VMInstance | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)

  const initVM = useCallback((canvas: HTMLCanvasElement) => {
    try {
      setError(null)
      const emulator = new AndroidEmulator(canvas)
      setVm({ canvas, emulator })
      
      // Simulate initialization delay (reduced for faster startup)
      setTimeout(() => {
        setIsReady(true)
      }, 500)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize VM'
      console.error('Failed to initialize VM:', error)
      setError(errorMessage)
      setIsReady(false)
    }
  }, [])

  const startVM = useCallback(() => {
    if (vm?.emulator) {
      try {
        setError(null)
        vm.emulator.start()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start VM'
        setError(errorMessage)
        console.error('Failed to start VM:', error)
      }
    }
  }, [vm])

  const installAPK = useCallback(async (file: File) => {
    if (!vm?.emulator) {
      const errorMsg = 'VM not initialized. Please start the VM first.'
      setError(errorMsg)
      console.error(errorMsg)
      throw new Error(errorMsg)
    }

    if (isInstalling) {
      console.warn('APK installation already in progress')
      return
    }

    // Validate file
    if (!file.name.endsWith('.apk')) {
      const errorMsg = 'Invalid file type. Please select an APK file.'
      setError(errorMsg)
      throw new Error(errorMsg)
    }

    // Check file size (limit to 100MB for browser performance)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      const errorMsg = `File too large. Maximum size is ${maxSize / 1024 / 1024}MB.`
      setError(errorMsg)
      throw new Error(errorMsg)
    }

    setIsInstalling(true)
    setError(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      await vm.emulator.installAPK(arrayBuffer)
      console.log('APK installed successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to install APK'
      setError(errorMessage)
      console.error('Failed to install APK:', error)
      throw error
    } finally {
      setIsInstalling(false)
    }
  }, [vm, isInstalling])

  const installedApps = useMemo(() => {
    return vm?.emulator?.getInstalledApps() || []
  }, [vm])

  return {
    vm: vm?.emulator || null,
    initVM,
    startVM,
    installAPK,
    isReady,
    error,
    isInstalling,
    installedApps,
  }
}
