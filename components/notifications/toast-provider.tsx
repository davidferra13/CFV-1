'use client'

import { Toaster } from 'sonner'

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 5000,
        style: {
          background: 'white',
          border: '1px solid #e7e5e4', // stone-200
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          fontSize: '0.875rem',
          color: '#1c1917', // stone-900
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
      }}
      visibleToasts={3}
      closeButton
    />
  )
}
