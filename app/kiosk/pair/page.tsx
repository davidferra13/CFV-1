'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const DEVICE_TOKEN_KEY = 'chefflow_kiosk_token'

export default function KioskPairPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-8" />}>
      <KioskPairContent />
    </Suspense>
  )
}

function KioskPairContent() {
  const searchParams = useSearchParams()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Auto-fill from query param
  useEffect(() => {
    const codeParam = searchParams?.get('code')
    if (codeParam) {
      setCode(codeParam.toUpperCase())
    }
  }, [searchParams])

  // If already paired, redirect to main kiosk page
  useEffect(() => {
    const existing = localStorage.getItem(DEVICE_TOKEN_KEY)
    if (existing) {
      window.location.href = '/kiosk'
    }
  }, [])

  async function handlePair() {
    if (!code.trim()) {
      setError('Enter a pairing code')
      return
    }
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/kiosk/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairing_code: code.toUpperCase().trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Pairing failed')
        setLoading(false)
        return
      }

      // Store token and redirect
      localStorage.setItem(DEVICE_TOKEN_KEY, data.token)
      window.location.href = '/kiosk'
    } catch {
      setError('Network error. Check your connection.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo / brand */}
        <div>
          <h1 className="text-4xl font-bold text-brand-500">ChefFlow</h1>
          <p className="mt-2 text-lg text-stone-400">Device Setup</p>
        </div>

        {/* Pairing form */}
        <div className="space-y-6 rounded-2xl bg-stone-900 p-8">
          <div>
            <h2 className="text-2xl font-semibold text-stone-100">Enter Pairing Code</h2>
            <p className="mt-2 text-sm text-stone-400">
              Find this code in your ChefFlow settings under Devices
            </p>
          </div>

          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXXXXXX"
            maxLength={10}
            autoFocus
            className="w-full rounded-xl bg-stone-800 px-6 py-4 text-center text-3xl font-mono tracking-[0.3em] text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePair()
            }}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={handlePair}
            disabled={loading || !code.trim()}
            className="w-full rounded-xl bg-brand-500 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Pairing...' : 'Pair Device'}
          </button>
        </div>

        <p className="text-xs text-stone-600">
          This device will be registered to your ChefFlow account
        </p>
      </div>
    </div>
  )
}
