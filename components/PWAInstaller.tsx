'use client'

import { useState, useEffect } from 'react'
import { Download, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if app was just installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowBanner(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
      setIsInstalled(true)
    } else {
      console.log('User dismissed the install prompt')
    }

    setDeferredPrompt(null)
    setShowBanner(false)
  }

  if (isInstalled || !showBanner || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border border-border rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Install Aquifer</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Install Aquifer as a Progressive Web App for a better experience
          </p>
          <div className="flex gap-2">
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Install
            </Button>
            <Button
              onClick={() => setShowBanner(false)}
              variant="ghost"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

