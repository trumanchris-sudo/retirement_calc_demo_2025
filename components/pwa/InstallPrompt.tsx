'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download, Smartphone, Check, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

const INSTALL_DISMISSED_KEY = 'pwa-install-dismissed'
const INSTALL_DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  // Check if the user has previously dismissed the prompt
  const isDismissed = useCallback(() => {
    if (typeof window === 'undefined') return true
    const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY)
    if (!dismissed) return false
    const dismissedTime = parseInt(dismissed, 10)
    if (Date.now() - dismissedTime > INSTALL_DISMISSED_DURATION) {
      localStorage.removeItem(INSTALL_DISMISSED_KEY)
      return false
    }
    return true
  }, [])

  // Detect iOS
  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
    setIsIOS(isIOSDevice)

    // Check if already installed as standalone
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
    setIsStandalone(isInStandaloneMode)

    // Don't show if already installed
    if (isInStandaloneMode) return

    // Don't show if previously dismissed
    if (isDismissed()) return

    // Show prompt after a delay for better UX (let user engage first)
    const timer = setTimeout(() => {
      if (isIOSDevice) {
        setShowPrompt(true)
      }
    }, 30000) // 30 seconds delay

    return () => clearTimeout(timer)
  }, [isDismissed])

  // Listen for the beforeinstallprompt event (Chrome/Android/Edge)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Don't show if already installed or dismissed
      if (isStandalone || isDismissed()) return

      // Show after delay
      setTimeout(() => {
        setShowPrompt(true)
      }, 30000) // 30 seconds delay
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Check if app was installed
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [isStandalone, isDismissed])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Install prompt error:', error)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setShowIOSInstructions(false)
    localStorage.setItem(INSTALL_DISMISSED_KEY, Date.now().toString())
  }

  const handleShowIOSInstructions = () => {
    setShowIOSInstructions(true)
  }

  // Don't render anything if already installed
  if (isStandalone || !showPrompt) return null

  const benefits = [
    'Access your retirement calculator offline',
    'Faster load times and instant access',
    'Full-screen experience without browser UI',
    'Your data stays private on your device',
  ]

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe animate-in slide-in-from-bottom-full duration-300"
      role="dialog"
      aria-labelledby="install-prompt-title"
      aria-describedby="install-prompt-description"
    >
      <div className="mx-auto max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-primary/10 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 id="install-prompt-title" className="font-semibold text-foreground">
                Install WORK DIE RETIRE
              </h2>
              <p className="text-sm text-muted-foreground">
                Add to your home screen
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 rounded-full hover:bg-accent transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {showIOSInstructions ? (
            // iOS-specific instructions
            <div className="space-y-4">
              <p id="install-prompt-description" className="text-sm text-muted-foreground">
                Follow these steps to install on your iPhone or iPad:
              </p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center">
                    1
                  </span>
                  <span className="text-sm text-foreground pt-0.5">
                    Tap the <Share className="inline w-4 h-4 text-primary mx-1" /> Share button in Safari&apos;s toolbar
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center">
                    2
                  </span>
                  <span className="text-sm text-foreground pt-0.5">
                    Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center">
                    3
                  </span>
                  <span className="text-sm text-foreground pt-0.5">
                    Tap <strong>&quot;Add&quot;</strong> in the top right corner
                  </span>
                </li>
              </ol>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setShowIOSInstructions(false)}
              >
                Got it
              </Button>
            </div>
          ) : (
            // Benefits and install button
            <>
              <p id="install-prompt-description" className="text-sm text-muted-foreground mb-4">
                Get the best experience with our app installed on your device.
              </p>
              <ul className="space-y-2 mb-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-3">
                {isIOS ? (
                  <Button
                    onClick={handleShowIOSInstructions}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Add to Home Screen
                  </Button>
                ) : deferredPrompt ? (
                  <Button
                    onClick={handleInstall}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Install App
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  onClick={handleDismiss}
                  className="flex-shrink-0"
                >
                  Not now
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-3 bg-muted/50 border-t border-border">
          <p className="text-xs text-center text-muted-foreground">
            No app store required - installs directly from your browser
          </p>
        </div>
      </div>
    </div>
  )
}
