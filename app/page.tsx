'use client'

import { AndroidVM } from '@/components/AndroidVM'
import { Header } from '@/components/Header'
import { ControlPanel } from '@/components/ControlPanel'
import { useState } from 'react'
import styles from './page.module.css'

export default function Home() {
  const [vmState, setVmState] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped')
  const [apkFile, setApkFile] = useState<File | null>(null)

  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.content}>
        <div className={styles.vmContainer}>
          <AndroidVM 
            vmState={vmState}
            setVmState={setVmState}
            apkFile={apkFile}
          />
        </div>
        <div className={styles.panelContainer}>
          <ControlPanel 
            vmState={vmState}
            setVmState={setVmState}
            apkFile={apkFile}
            setApkFile={setApkFile}
          />
        </div>
      </div>
    </main>
  )
}

