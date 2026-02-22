'use client'

/**
 * AI & Privacy Trust Center — Settings page.
 *
 * If the user hasn't completed onboarding, shows the full onboarding wizard.
 * If they have, shows the Trust Center with data controls, feature toggles,
 * the schematic, and best practices reference.
 */

import { useState, useEffect, useCallback } from 'react'
import { Shield, Bot, Eye, RefreshCw } from 'lucide-react'
import { RemyOnboardingWizard } from '@/components/ai-privacy/remy-onboarding-wizard'
import { DataFlowAnimated } from '@/components/ai-privacy/data-flow-animated'
import { DataControls } from '@/components/ai-privacy/data-controls'
import {
  getAiPreferences,
  getAiDataSummary,
  type AiPreferences,
  type AiDataSummary,
} from '@/lib/ai/privacy-actions'

export default function AiPrivacyPage() {
  const [prefs, setPrefs] = useState<AiPreferences | null>(null)
  const [summary, setSummary] = useState<AiDataSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([getAiPreferences(), getAiDataSummary()])
      setPrefs(p)
      setSummary(s)
    } catch (err) {
      console.error('Failed to load AI preferences:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleOnboardingComplete = () => {
    load() // Refresh to show the Trust Center
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-200 rounded w-1/3" />
          <div className="h-4 bg-stone-200 rounded w-2/3" />
          <div className="h-64 bg-stone-200 rounded" />
        </div>
      </div>
    )
  }

  if (!prefs) return null

  // ─── Show onboarding wizard if not yet completed ──────────
  if (!prefs.onboarding_completed) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <RemyOnboardingWizard onComplete={handleOnboardingComplete} />
      </div>
    )
  }

  // ─── Show Trust Center (post-onboarding) ──────────────────
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center">
            <Shield className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">AI &amp; Privacy</h1>
            <p className="text-sm text-stone-500">Full control over Remy and your AI data.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              prefs.remy_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${
                prefs.remy_enabled ? 'bg-emerald-500' : 'bg-stone-400'
              }`}
            />
            {prefs.remy_enabled ? 'Remy Active' : 'Remy Off'}
          </div>
        </div>
      </div>

      {/* Status banner */}
      {prefs.remy_enabled ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center gap-3">
          <Bot className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-900">
              Remy is active and running on ChefFlow&apos;s private infrastructure.
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Your data stays within ChefFlow. Nothing is sent to third-party AI services like
              OpenAI or Google.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 flex items-center gap-3">
          <Bot className="h-5 w-5 text-stone-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-stone-700">Remy is currently disabled.</p>
            <p className="text-xs text-stone-500 mt-0.5">
              Your existing AI data is preserved. Enable Remy from the controls below.
            </p>
          </div>
        </div>
      )}

      {/* How It Works — always visible, collapsible */}
      <details className="rounded-xl border border-stone-200 bg-white">
        <summary className="cursor-pointer px-5 py-4">
          <div className="inline-flex items-center gap-2">
            <Eye className="h-4 w-4 text-brand-500" />
            <h2 className="text-lg font-semibold text-stone-900">How It Works</h2>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Visual explanation of where your data goes (and doesn&apos;t go).
          </p>
        </summary>
        <div className="border-t border-stone-200 p-5">
          <DataFlowAnimated />
        </div>
      </details>

      {/* Data Controls & Feature Toggles */}
      {summary && <DataControls initialPrefs={prefs} initialSummary={summary} onRefresh={load} />}

      {/* Transparency footer */}
      <div className="rounded-xl bg-stone-50 border border-stone-200 p-5 space-y-3">
        <h3 className="font-semibold text-stone-900">Our Promise</h3>
        <div className="text-sm text-stone-600 space-y-2">
          <p>
            <strong>We will never:</strong> Send your data to external AI services, use your data to
            train any model, share your information with third parties, or make it difficult to
            delete your data.
          </p>
          <p>
            <strong>We will always:</strong> Process AI on ChefFlow&apos;s own servers (never
            third-party AI), give you complete visibility into what Remy knows, let you delete any
            or all data instantly, and respect your choice to opt out entirely.
          </p>
          <p>
            <strong>How to verify:</strong> Remy uses Ollama, a private AI engine that runs on
            ChefFlow&apos;s infrastructure — not OpenAI, not Google, not any third-party service.
            Your data never leaves ChefFlow&apos;s systems.
          </p>
        </div>
      </div>
    </div>
  )
}
