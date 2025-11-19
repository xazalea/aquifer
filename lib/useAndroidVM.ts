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
  const [emulationMode, setEmulationMode] = useState<EmulationMode>('webvm-emuhub')

  const initVM = useCallback(async (canvas: HTMLCanvasElement, mode: EmulationMode = 'webvm-emuhub') => {
    try {
      setError(null)
      setIsReady(false)
      
      // Clean up existing VM if switching modes
      if (vm?.emulator) {
        try {
          await (vm.emulator as any).stop?.()
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      
      // Only initialize browser mode if explicitly requested
      if (mode === 'browser') {
        const browserEmulator = new HybridEmulator(canvas, { mode: 'browser' })
        const initialized = await browserEmulator.init()
        if (!initialized) {
          throw new Error('Failed to initialize browser emulator')
        }
        setVm({ canvas, emulator: browserEmulator })
        setEmulationMode('browser')
        setTimeout(() => {
          setIsReady(true)
        }, 500)
        return
      }
      
      // For 'auto' or 'webvm-emuhub', always use Docker/WebVM
      const dockerMode = mode === 'auto' ? 'webvm-emuhub' : mode
      const dockerEmulator = new HybridEmulator(canvas, { mode: dockerMode })
      const initialized = await dockerEmulator.init()
      
      if (!initialized) {
        throw new Error('Failed to initialize Docker/WebVM emulator')
      }
      
      setVm({ canvas, emulator: dockerEmulator })
      setEmulationMode('webvm-emuhub')
      
      setTimeout(() => {
        setIsReady(true)
      }, 500)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize VM'
      console.error('Failed to initialize VM:', error)
      setError(errorMessage)
      setIsReady(false)
    }
  }, [vm])

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

  const launchApp = useCallback(async (packageName: string) => {
    if (vm?.emulator) {
      const browserEmulator = (vm.emulator as any).getBrowserEmulator?.()
      if (browserEmulator) {
        browserEmulator.launchApp(packageName)
        // Ensure app is actually running
        if (!browserEmulator.isRunning) {
          await browserEmulator.start()
        }
      } else {
        // Try to launch via hybrid emulator (async)
        const hybridEmulator = vm.emulator as any
        if (hybridEmulator.launchApp) {
          await hybridEmulator.launchApp(packageName)
        }
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
