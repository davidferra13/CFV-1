'use client'

/**
 * RemyGate — wraps any Remy-powered UI.
 * If the chef hasn't completed the AI onboarding, shows a prompt
 * directing them to the AI & Privacy settings page first.
 */

import { useState, useEffect } from 'react'
import { Shield, ArrowRight, Bot } from 'lucide-react'
import Link from 'next/link'
import { getAiPreferences } from '@/lib/ai/privacy-actions'

export function RemyGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'gated' | 'allowed'>('loading')

  useEffect(() => {
    getAiPreferences()
      .then((prefs) => {
        if (prefs.onboarding_completed && prefs.remy_enabled) {
          setStatus('allowed')
        } else {
          setStatus('gated')
        }
      })
      .catch(() => {
        setStatus('gated')
      })
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'allowed') {
    return <>{children}</>
  }

  // ─── Gated: show the setup prompt ─────────────────────────
  return (
    <div className="max-w-lg mx-auto py-12 px-6 text-center space-y-6">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-100 flex items-center justify-center">
        <Shield className="h-8 w-8 text-brand-600" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-stone-900">Set Up Remy</h2>
        <p className="text-stone-500 text-sm leading-relaxed">
          Before using Remy, take a quick look at how it works. Remy runs on ChefFlow&apos;s private
          infrastructure — your conversations are never sent to external AI services.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3 text-left">
        <p className="text-sm font-medium text-stone-900">Quick setup covers:</p>
        <ul className="text-sm text-stone-600 space-y-1.5">
          <li className="flex items-center gap-2">
            <Bot className="h-3.5 w-3.5 text-brand-500 shrink-0" />
            What Remy can help you with
          </li>
          <li className="flex items-center gap-2">
            <Bot className="h-3.5 w-3.5 text-brand-500 shrink-0" />
            How your data stays private
          </li>
          <li className="flex items-center gap-2">
            <Bot className="h-3.5 w-3.5 text-brand-500 shrink-0" />
            How to manage or delete anything Remy creates
          </li>
          <li className="flex items-center gap-2">
            <Bot className="h-3.5 w-3.5 text-brand-500 shrink-0" />
            Best practices for using Remy effectively
          </li>
        </ul>
      </div>

      <Link
        href="/settings/ai-privacy"
        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3
                   text-sm font-semibold text-white hover:bg-brand-600
                   shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all"
      >
        Get Started
        <ArrowRight className="h-4 w-4" />
      </Link>

      <p className="text-xs text-stone-400">Takes about 2 minutes.</p>
    </div>
  )
}
