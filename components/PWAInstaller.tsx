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
    <div 
      className="fixed bottom-2 right-2 z-40 opacity-70 hover:opacity-100 transition-opacity duration-300"
      style={{
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '8px 12px',
        maxWidth: '200px',
        fontSize: '12px',
      }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors text-xs font-medium"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="text-white/60 hover:text-white/90 transition-colors p-0.5"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}
          aria-label="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

