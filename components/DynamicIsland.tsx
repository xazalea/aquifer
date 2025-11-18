/**
 * Dynamic Island - iOS-style floating control panel
 * 
 * Provides a beautiful, animated floating control panel that expands/collapses
 * with smooth animations, similar to iOS Dynamic Island
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Square, Upload, Settings, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ControlPanel } from '@/components/ControlPanel'
import { AppStore } from '@/components/AppStore'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import styles from './DynamicIsland.module.css'

interface DynamicIslandProps {
  vmState: 'stopped' | 'starting' | 'running' | 'error'
  setVmState: (state: 'stopped' | 'starting' | 'running' | 'error') => void
  apkFile: File | null
  setApkFile: (file: File | null) => void
  error: string | null
  isInstalling: boolean
  installedApps: any[]
  onLaunchApp: (packageName: string) => void
  onUninstallApp: (packageName: string) => void
  runningAppPackage: string | null
  emulationMode: 'browser' | 'webvm-emuhub' | 'auto'
  onEmulationModeChange: (mode: 'browser' | 'webvm-emuhub' | 'auto') => void
  onInstallFromStore: (apkData: ArrayBuffer) => Promise<void>
}

export function DynamicIsland({
  vmState,
  setVmState,
  apkFile,
  setApkFile,
  error,
  isInstalling,
  installedApps,
  onLaunchApp,
  onUninstallApp,
  runningAppPackage,
  emulationMode,
  onEmulationModeChange,
  onInstallFromStore,
}: DynamicIslandProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'controls' | 'store'>('controls')
  const islandRef = useRef<HTMLDivElement>(null)

  // Auto-expand on important events
  useEffect(() => {
    if (error || isInstalling || vmState === 'error') {
      setIsExpanded(true)
    }
  }, [error, isInstalling, vmState])

  // Close on click outside when expanded
  useEffect(() => {
    if (!isExpanded) return

    const handleClickOutside = (event: MouseEvent) => {
      if (islandRef.current && !islandRef.current.contains(event.target as Node)) {
        // Don't close if clicking on the emulator canvas
        const target = event.target as HTMLElement
        if (!target.closest('canvas') && !target.closest('[data-dynamic-island-content]')) {
          setIsExpanded(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isExpanded])

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div
      ref={islandRef}
      className={`${styles.dynamicIsland} ${isExpanded ? styles.expanded : styles.collapsed}`}
      data-dynamic-island-content
    >
      {/* Collapsed State - Compact Controls */}
      <div className={styles.collapsedContent}>
        <div className={styles.statusIndicator}>
          <div className={`${styles.statusDot} ${styles[`status${vmState.charAt(0).toUpperCase() + vmState.slice(1)}`]}`} />
          <span className={styles.statusText}>
            {vmState === 'running' ? 'Running' : vmState === 'starting' ? 'Starting...' : 'Stopped'}
          </span>
        </div>
        <button
          className={styles.expandButton}
          onClick={toggleExpanded}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronDown className={styles.icon} /> : <ChevronUp className={styles.icon} />}
        </button>
      </div>

      {/* Expanded State - Full Controls */}
      {isExpanded && (
        <div className={styles.expandedContent}>
          <div className={styles.expandedHeader}>
            <h3 className={styles.expandedTitle}>Controls</h3>
            <button
              className={styles.closeButton}
              onClick={toggleExpanded}
              aria-label="Close"
            >
              <X className={styles.icon} />
            </button>
          </div>

          <div className={styles.expandedBody}>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'controls' | 'store')} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="controls">Controls</TabsTrigger>
                <TabsTrigger value="store">App Store</TabsTrigger>
              </TabsList>
              <TabsContent value="controls" className="mt-0">
                <ControlPanel
                  vmState={vmState}
                  setVmState={setVmState}
                  apkFile={apkFile}
                  setApkFile={setApkFile}
                  error={error}
                  isInstalling={isInstalling}
                  installedApps={installedApps}
                  onLaunchApp={onLaunchApp}
                  onUninstallApp={onUninstallApp}
                  runningAppPackage={runningAppPackage}
                  emulationMode={emulationMode}
                  onEmulationModeChange={onEmulationModeChange}
                />
              </TabsContent>
              <TabsContent value="store" className="mt-0">
                <AppStore
                  onInstallAPK={onInstallFromStore}
                  isInstalling={isInstalling}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  )
}

