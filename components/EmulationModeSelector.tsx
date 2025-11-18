/**
 * Emulation Mode Selector Component
 * 
 * Allows users to choose between:
 * - Browser-based emulation (current Aquifer)
 * - EmuHub Docker-based emulation
 * - WebVM-based virtualization
 * - Auto (detects best available)
 */

'use client'

import { useState, useEffect } from 'react'
import { WebVMEmuHubIntegration } from '@/lib/webvm-emuhub-integration'
import { Button } from '@/components/ui/button'
import { Monitor, Server, Cpu, Zap } from 'lucide-react'

export type EmulationMode = 'browser' | 'webvm-emuhub' | 'auto'

interface EmulationModeSelectorProps {
  currentMode: EmulationMode
  onModeChange: (mode: EmulationMode) => void
}

export function EmulationModeSelector({ currentMode, onModeChange }: EmulationModeSelectorProps) {
  const [webvmEmuhubAvailable, setWebvmEmuhubAvailable] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkAvailability()
  }, [])

  const checkAvailability = async () => {
    setChecking(true)
    
    // Check WebVM + EmuHub combined
    const webvmEmuhub = new WebVMEmuHubIntegration()
    const available = await webvmEmuhub.init()
    setWebvmEmuhubAvailable(available)
    
    setChecking(false)
  }

  const modes: Array<{
    value: EmulationMode
    label: string
    description: string
    icon: React.ReactNode
    available: boolean
  }> = [
    {
      value: 'auto',
      label: 'Auto',
      description: 'Automatically select the best available mode',
      icon: <Zap className="w-4 h-4" />,
      available: true,
    },
    {
      value: 'browser',
      label: 'Browser',
      description: 'Pure browser-based emulation (always available)',
      icon: <Monitor className="w-4 h-4" />,
      available: true,
    },
    {
      value: 'webvm-emuhub',
      label: 'WebVM + EmuHub',
      description: 'WebVM runs Docker, EmuHub provides Android emulation',
      icon: <Server className="w-4 h-4" />,
      available: webvmEmuhubAvailable,
    },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Emulation Mode</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Choose how Android apps are emulated. Browser mode works everywhere,
          while WebVM + EmuHub uses WebVM to run Docker containers with EmuHub
          for full Android emulation.
        </p>
      </div>

      {checking && (
        <div className="text-sm text-muted-foreground">
          Checking available modes...
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {modes.map((mode) => (
          <Button
            key={mode.value}
            variant={currentMode === mode.value ? 'default' : 'outline'}
            className="flex flex-col items-start h-auto p-3"
            onClick={() => onModeChange(mode.value)}
            disabled={!mode.available && mode.value !== 'browser' && mode.value !== 'auto'}
            title={!mode.available ? `${mode.label} is not available` : undefined}
          >
            <div className="flex items-center gap-2 mb-1">
              {mode.icon}
              <span className="font-medium">{mode.label}</span>
              {!mode.available && mode.value !== 'browser' && mode.value !== 'auto' && (
                <span className="text-xs text-muted-foreground">(Unavailable)</span>
              )}
            </div>
            <span className="text-xs text-left text-muted-foreground">
              {mode.description}
            </span>
          </Button>
        ))}
      </div>

      {currentMode === 'webvm-emuhub' && !webvmEmuhubAvailable && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>WebVM + EmuHub not available.</strong> To use this mode:
          </p>
          <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-2 ml-4 list-disc">
            <li>WebVM must be loaded (provides Docker runtime)</li>
            <li>WebVM will start EmuHub container automatically</li>
            <li>Ensure WebVM is properly initialized</li>
            <li>Check browser console for initialization errors</li>
          </ul>
        </div>
      )}
    </div>
  )
}

