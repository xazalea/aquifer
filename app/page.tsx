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
  const [emulationMode, setEmulationMode] = useState<'browser' | 'webvm-emuhub' | 'auto'>('browser')
  const { installAPK, vm, installedApps } = useAndroidVM()

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
          if (vm) {
            vm.launchApp(packageName)
          }
        }}
        onUninstallApp={(packageName) => {
          if (vm) {
            vm.uninstallApp(packageName)
            setApkFile(null)
          }
        }}
        runningAppPackage={vm?.getRunningApp()?.packageName || null}
        emulationMode={emulationMode}
        onEmulationModeChange={setEmulationMode}
        onInstallFromStore={handleInstallFromStore}
      />
      <PWAInstaller />
    </main>
  )
}
