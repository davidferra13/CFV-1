'use client'

import { useEffect } from 'react'

export function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        console.warn('[SW] Registration failed', err)
      })
    }
  }, [])

  return null
}
