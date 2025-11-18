'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { AndroidEmulator } from './android-emulator'
import { HybridEmulator, EmulationMode } from './hybrid-emulator'

interface VMInstance {
  canvas: HTMLCanvasElement
  emulator: HybridEmulator | AndroidEmulator | null
}

export function useAndroidVM() {
  const [vm, setVm] = useState<VMInstance | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)
  const [emulationMode, setEmulationMode] = useState<EmulationMode>('browser')

  const initVM = useCallback(async (canvas: HTMLCanvasElement, mode: EmulationMode = 'browser') => {
    try {
      setError(null)
      const emulator = new HybridEmulator(canvas, { mode }) // Use HybridEmulator with config
      const initialized = await emulator.init() // Initialize the hybrid emulator
      
      if (!initialized) {
        throw new Error('Failed to initialize emulator')
      }
      
      setVm({ canvas, emulator })
      setEmulationMode(mode)
      
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

  const startVM = useCallback(async () => {
    if (vm?.emulator) {
      try {
        setError(null)
        const browserEmulator = (vm.emulator as any).getBrowserEmulator?.()
        if (browserEmulator) {
          browserEmulator.start()
        } else {
          // Try hybrid emulator start
          await (vm.emulator as any).start?.()
        }
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

    // No file size limit - allow any size APK
    setIsInstalling(true)
    setError(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      await (vm.emulator as any).installAPK(arrayBuffer, file.name)
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

  const launchApp = useCallback((packageName: string) => {
    if (vm?.emulator) {
      const browserEmulator = (vm.emulator as any).getBrowserEmulator?.()
      if (browserEmulator) {
        browserEmulator.launchApp(packageName)
      } else {
        // Try to launch via hybrid emulator
        ;(vm.emulator as any).launchApp?.(packageName)
      }
    }
  }, [vm])

  const uninstallApp = useCallback((packageName: string) => {
    if (vm?.emulator) {
      const browserEmulator = (vm.emulator as any).getBrowserEmulator?.()
      if (browserEmulator) {
        browserEmulator.uninstallApp(packageName)
      } else {
        // Try to uninstall via hybrid emulator
        ;(vm.emulator as any).uninstallApp?.(packageName)
      }
    }
  }, [vm])

  const getRunningApp = useCallback(() => {
    if (vm?.emulator) {
      const browserEmulator = (vm.emulator as any).getBrowserEmulator?.()
      if (browserEmulator) {
        return browserEmulator.getRunningApp()
      }
    }
    return null
  }, [vm])

  const installedApps = useMemo(() => {
    if (vm?.emulator) {
      const browserEmulator = (vm.emulator as any).getBrowserEmulator?.()
      if (browserEmulator) {
        return browserEmulator.getInstalledApps()
      }
      // Try hybrid emulator
      return (vm.emulator as any).getInstalledApps?.() || []
    }
    return []
  }, [vm])

  return {
    vm: (vm?.emulator as any)?.getBrowserEmulator?.() || vm?.emulator || null, // Return browser emulator for direct access
    hybridEmulator: vm?.emulator || null, // Also expose hybrid emulator
    initVM,
    startVM,
    installAPK,
    launchApp,
    uninstallApp,
    getRunningApp,
    isReady,
    error,
    isInstalling,
    installedApps,
    emulationMode, // Expose emulation mode
    setEmulationMode, // Expose setter for emulation mode
  }
}
