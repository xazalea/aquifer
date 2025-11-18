'use client'

import { AndroidVM } from '@/components/AndroidVM'
import { Header } from '@/components/Header'
import { ControlPanel } from '@/components/ControlPanel'
import { AppStore } from '@/components/AppStore'
import { PWAInstaller } from '@/components/PWAInstaller'
import { useState, useRef, useEffect } from 'react'
import { useAndroidVM } from '@/lib/useAndroidVM'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { appStorage } from '@/lib/app-storage'
import styles from './page.module.css'

export default function Home() {
  const [vmState, setVmState] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped')
  const [apkFile, setApkFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)
  const [activeTab, setActiveTab] = useState<'controls' | 'store'>('controls')
  const [emulationMode, setEmulationMode] = useState<'browser' | 'webvm-emuhub' | 'auto'>('auto')
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
      // Switch to controls tab after installation
      setActiveTab('controls')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to install APK'
      setError(errorMessage)
      throw error
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <main className={`${styles.main} relative min-h-screen`}>
      <Header />
      <div className={styles.content}>
            <div className={styles.vmContainer}>
              <AndroidVM 
                vmState={vmState}
                setVmState={setVmState}
                apkFile={apkFile}
                onError={setError}
                onInstallingChange={setIsInstalling}
                emulationMode={emulationMode}
              />
            </div>
        <div className={styles.panelContainer}>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'controls' | 'store')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="controls">Controls</TabsTrigger>
              <TabsTrigger value="store">App Store</TabsTrigger>
            </TabsList>
                <TabsContent value="controls" className="mt-4">
                  <ControlPanel 
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
                  />
                </TabsContent>
            <TabsContent value="store" className="mt-4">
              <AppStore 
                onInstallAPK={handleInstallFromStore}
                isInstalling={isInstalling}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <PWAInstaller />
    </main>
  )
}
