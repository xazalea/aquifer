'use client'

import { AndroidVM } from '@/components/AndroidVM'
import { Header } from '@/components/Header'
import { EnhancedHeader } from '@/components/EnhancedHeader'
import { ControlPanel } from '@/components/ControlPanel'
import { useState } from 'react'
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern'
import { Meteors } from '@/components/ui/meteors'
import { FlickeringGrid } from '@/components/ui/flickering-grid'
import { DotPattern } from '@/components/ui/dot-pattern'
import { RetroGrid } from '@/components/ui/retro-grid'
import styles from './page.module.css'

export default function Home() {
  const [vmState, setVmState] = useState<'stopped' | 'starting' | 'running' | 'error'>('stopped')
  const [apkFile, setApkFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)

  return (
    <main className={`${styles.main} relative min-h-screen overflow-hidden`}>
      {/* Animated Background Effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/80" />
        <FlickeringGrid
          className="absolute inset-0 opacity-30"
          squareSize={4}
          gridGap={6}
          color="rgb(59, 130, 246)"
          maxOpacity={0.15}
        />
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.08}
          duration={3}
          repeatDelay={1}
          className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"
        />
        <DotPattern
          className="absolute inset-0 opacity-20"
          width={20}
          height={20}
          cx={1}
          cy={1}
          cr={1}
        />
        <RetroGrid
          className="absolute inset-0 opacity-10"
          angle={65}
          cellSize={60}
        />
        <Meteors number={15} />
      </div>

      <EnhancedHeader />
      <div className={styles.content}>
        <div className={styles.vmContainer}>
          <AndroidVM 
            vmState={vmState}
            setVmState={setVmState}
            apkFile={apkFile}
            onError={setError}
            onInstallingChange={setIsInstalling}
          />
        </div>
        <div className={styles.panelContainer}>
          <ControlPanel 
            vmState={vmState}
            setVmState={setVmState}
            apkFile={apkFile}
            setApkFile={setApkFile}
            error={error}
            isInstalling={isInstalling}
          />
        </div>
      </div>
    </main>
  )
}
