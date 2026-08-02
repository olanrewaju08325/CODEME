import { useState, useEffect } from 'react'

// ── PWA install prompt hook ──────────────────────────────────────────────────
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('[PWA] Service Worker registration failed:', err)
      })
    }

    // Listen for browser install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Only show if user hasn't dismissed before
      const dismissed = localStorage.getItem('codeme_pwa_dismissed')
      if (!dismissed) setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler as any)

    return () => window.removeEventListener('beforeinstallprompt', handler as any)
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
      setDeferredPrompt(null)
    }
  }

  const dismissBanner = () => {
    setShowBanner(false)
    localStorage.setItem('codeme_pwa_dismissed', '1')
  }

  return { showBanner, installApp, dismissBanner }
}

// ── Push Notification helper ────────────────────────────────────────────────
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return await Notification.requestPermission()
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) return existing
    // In production: replace VAPID_PUBLIC_KEY with your actual key from Supabase/web-push setup
    const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBrqLvAdQRGBBQSHFkE'
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    return subscription
  } catch (e) {
    console.error('[PWA] Push subscription failed:', e)
    return null
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
