'use client'

import { Toaster } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 5000,
        style: {
          background: 'rgba(28, 25, 23, 0.85)',
          backdropFilter: 'blur(16px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          fontSize: '0.875rem',
          color: '#e7e5e4',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(232, 143, 71, 0.04)',
        },
      }}
      visibleToasts={3}
      closeButton
    />
  )
}
