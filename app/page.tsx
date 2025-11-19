'use client'

import { AndroidVM } from '@/components/AndroidVM'
import { Header } from '@/components/Header'
import { DynamicIsland } from '@/components/DynamicIsland'
import { PWAInstaller } from '@/components/PWAInstaller'
import { useState, useEffect } from 'react'
import { useAndroidVM } from '@/lib/useAndroidVM'
import { appStorage } from '@/lib/app-storage'
import styles from './page.module.css'

export default function Home() {
  const [vmState, setVmState] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped')
  const [apkFile, setApkFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)
  const { 
    installAPK, 
    vm, 
    installedApps, 
    launchApp, 
    uninstallApp, 
    getRunningApp,
    emulationMode: hookEmulationMode,
    setEmulationMode: setHookEmulationMode
  } = useAndroidVM()
  const [emulationMode, setEmulationMode] = useState<'browser' | 'webvm-emuhub' | 'auto'>('auto')
  
  // Sync emulation mode with hook
  useEffect(() => {
    if (hookEmulationMode !== emulationMode) {
      setHookEmulationMode(emulationMode)
    }
  }, [emulationMode, hookEmulationMode, setHookEmulationMode])

  // Listen for manual mode switch from error screen
  useEffect(() => {
    const handleModeSwitch = (event: CustomEvent) => {
      const newMode = event.detail as 'browser' | 'webvm-emuhub' | 'auto'
      setEmulationMode(newMode)
      setError(null) // Clear error when switching modes
    }
    
    window.addEventListener('switch-emulation-mode', handleModeSwitch as EventListener)
    return () => {
      window.removeEventListener('switch-emulation-mode', handleModeSwitch as EventListener)
    }
  }, [])

  // Initialize app storage
  useEffect(() => {
    appStorage.init().catch(console.error)
  }, [])

  const handleInstallFromStore = async (apkData: ArrayBuffer) => {
    try {
      setIsInstalling(true)
      setError(null)
      // Create a File object from ArrayBuffer for compatibility
      const blob = new Blob([apkData], { type: 'application/vnd.android.package-archive' })
      const file = new File([blob], 'app.apk', { type: 'application/vnd.android.package-archive' })
      setApkFile(file)
      await installAPK(file)
      // Installation complete
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to install APK'
      setError(errorMessage)
      throw error
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <main className={`${styles.main} relative`}>
      <Header />
      <div className={styles.fullscreenContainer}>
        <AndroidVM 
          vmState={vmState}
          setVmState={setVmState}
          apkFile={apkFile}
          onError={setError}
          onInstallingChange={setIsInstalling}
          emulationMode={emulationMode}
        />
      </div>
      <DynamicIsland
        vmState={vmState}
        setVmState={setVmState}
        apkFile={apkFile}
        setApkFile={setApkFile}
        error={error}
        isInstalling={isInstalling}
        installedApps={installedApps}
        onLaunchApp={(packageName) => {
          launchApp(packageName)
        }}
        onUninstallApp={(packageName) => {
          uninstallApp(packageName)
          setApkFile(null)
        }}
        runningAppPackage={getRunningApp()?.packageName || null}
        emulationMode={emulationMode}
        onEmulationModeChange={setEmulationMode}
        onInstallFromStore={handleInstallFromStore}
      />
      <PWAInstaller />
    </main>
  )
}
