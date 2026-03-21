'use client'

/**
 * AI & Privacy - Settings page (Trust Center).
 *
 * If the user hasn't completed onboarding, shows the onboarding wizard.
 * Otherwise shows the Trust Center with:
 * - "Your conversations are private" (confident, factual)
 * - How it works / What we can see / If you need help (3 sections)
 * - External services disclosure (honest about Spoonacular, Kroger, etc.)
 * - Anonymous usage metrics summary
 * - Data controls (feature toggles, delete, disable)
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  Bot,
  Server,
  Eye,
  Headphones,
  BarChart3,
  ExternalLink,
  Search,
  ShoppingCart,
  Utensils,
} from '@/components/ui/icons'
import { RemyOnboardingWizard } from '@/components/ai-privacy/remy-onboarding-wizard'
import { DataFlowAnimated } from '@/components/ai-privacy/data-flow-animated'
import { DataControls } from '@/components/ai-privacy/data-controls'

import { RemyArchetypeSelector } from '@/components/ai-privacy/remy-archetype-selector'
import {
  getAiPreferences,
  getAiDataSummary,
  type AiPreferences,
  type AiDataSummary,
} from '@/lib/ai/privacy-actions'
import { getRemyMetricsSummary } from '@/lib/ai/remy-metrics'

export default function AiPrivacyPage() {
  const [prefs, setPrefs] = useState<AiPreferences | null>(null)
  const [summary, setSummary] = useState<AiDataSummary | null>(null)
  const [metrics, setMetrics] = useState<{
    totalConversations: number
    totalMessages: number
    topCategory: string | null
    since: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [p, s, m] = await Promise.all([
        getAiPreferences(),
        getAiDataSummary(),
        getRemyMetricsSummary(),
      ])
      setPrefs(p)
      setSummary(s)
      setMetrics(m)
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
    load()
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-700 rounded w-1/3" />
          <div className="h-4 bg-stone-700 rounded w-2/3" />
          <div className="h-64 bg-stone-700 rounded" />
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
          <div className="h-10 w-10 rounded-xl bg-brand-900 flex items-center justify-center">
            <Shield className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-100">Privacy &amp; Data</h1>
            <p className="text-sm text-stone-500">Your conversations with Remy are private.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              prefs.remy_enabled ? 'bg-emerald-900 text-emerald-700' : 'bg-stone-800 text-stone-500'
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

      {/* ─── Remy Personality Selector ─────────────────────────── */}
      {prefs.remy_enabled && (
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-6">
          <RemyArchetypeSelector currentArchetype={prefs.remy_archetype} />
        </div>
      )}

      {/* ─── Section 1: How It Works ─────────────────────────── */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-stone-100">How it works</h2>
        </div>
        <div className="text-sm text-stone-300 space-y-3 leading-relaxed">
          <p>
            Remy runs on ChefFlow&apos;s private AI infrastructure - not OpenAI, not Google, not any
            third-party cloud AI service. When you talk to Remy, your conversation is processed on
            our private servers and the response is sent back to you.
          </p>
          <p>
            We don&apos;t store what you say or what Remy says. Your conversation history lives in
            your browser, on your device. If you switch browsers or clear your browser data, your
            conversation history goes with it - because it was never on our servers to begin with.
          </p>
        </div>
      </div>

      {/* ─── Section 2: What We Can See ──────────────────────── */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-stone-100">What we can see</h2>
        </div>
        <div className="text-sm text-stone-300 space-y-3 leading-relaxed">
          <p>
            We can see that you used Remy - how often, which features, whether errors occurred. We
            cannot see what you talked about.
          </p>
          <p>
            This isn&apos;t a policy choice - it&apos;s how the system is built. There is no
            database table for your conversations. There is no log file. The data doesn&apos;t exist
            on our servers.
          </p>
        </div>

        {/* Anonymous metrics summary - shows the chef what we actually have */}
        {metrics && metrics.totalMessages > 0 && (
          <div className="rounded-lg bg-stone-800 border border-stone-700 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-stone-300" />
              <p className="text-xs font-medium text-stone-300">
                What we know about your Remy usage (this is all of it):
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-stone-100">{metrics.totalConversations}</p>
                <p className="text-xs text-stone-500">Conversations</p>
              </div>
              <div>
                <p className="text-lg font-bold text-stone-100">{metrics.totalMessages}</p>
                <p className="text-xs text-stone-500">Messages</p>
              </div>
              <div>
                <p className="text-lg font-bold text-stone-100">{metrics.topCategory ?? '-'}</p>
                <p className="text-xs text-stone-500">Top category</p>
              </div>
              <div>
                <p className="text-lg font-bold text-stone-100">
                  {metrics.since
                    ? new Date(metrics.since).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'}
                </p>
                <p className="text-xs text-stone-500">Since</p>
              </div>
            </div>
            <p className="text-xs text-stone-300 italic">
              Counts only. No conversation content. No client names. No recipes.
            </p>
          </div>
        )}
      </div>

      {/* ─── Section 3: If You Need Help ─────────────────────── */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Headphones className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-stone-100">If you need help</h2>
        </div>
        <div className="text-sm text-stone-300 space-y-3 leading-relaxed">
          <p>
            If Remy isn&apos;t working right and you want to share a conversation with our support
            team, you can do that from inside any conversation. Tap &ldquo;Send to Support&rdquo;
            and that specific conversation will be shared.
          </p>
          <p>You choose what to share. We never pull anything automatically.</p>
        </div>
      </div>

      {/* ─── External Services Disclosure ────────────────────── */}
      <div className="rounded-xl border border-amber-200 bg-amber-950/50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-stone-100">Other services we use</h2>
        </div>
        <div className="text-sm text-stone-300 space-y-3 leading-relaxed">
          <p>
            Some ChefFlow features use external APIs for things like grocery pricing, nutrition
            data, and store availability. These services receive only the specific item-level data
            they need to function (e.g., &ldquo;broccoli price&rdquo;) - never your name, your
            clients&apos; names, or any personal information.
          </p>
          <p>
            This is separate from Remy. Remy&apos;s conversations are processed entirely on
            ChefFlow&apos;s private infrastructure. These external lookups are comparable to
            searching for a product on a grocery store&apos;s website.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: Search,
              name: 'Spoonacular',
              use: 'Nutrition & recipe data',
            },
            {
              icon: ShoppingCart,
              name: 'Kroger / Instacart',
              use: 'Grocery pricing & availability',
            },
            {
              icon: Utensils,
              name: 'MealMe',
              use: 'Local store search',
            },
          ].map((svc) => (
            <div
              key={svc.name}
              className="rounded-lg border border-amber-200 bg-stone-900 p-3 space-y-1"
            >
              <div className="flex items-center gap-2">
                <svc.icon className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-stone-200">{svc.name}</span>
              </div>
              <p className="text-xs text-stone-500">{svc.use}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-500">
          These services have their own privacy policies. We send them the minimum data necessary
          and never include personal information.
        </p>
      </div>

      {/* ─── Static data flow diagram (collapsible) ──── */}
      <details className="rounded-xl border border-stone-700 bg-stone-900">
        <summary className="cursor-pointer px-5 py-4">
          <div className="inline-flex items-center gap-2">
            <Bot className="h-4 w-4 text-brand-500" />
            <h2 className="text-lg font-semibold text-stone-100">Static data flow diagram</h2>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Side-by-side comparison of ChefFlow vs. other AI services.
          </p>
        </summary>
        <div className="border-t border-stone-700 p-5">
          <DataFlowAnimated />
        </div>
      </details>

      {/* Data Controls & Feature Toggles */}
      {summary && <DataControls initialPrefs={prefs} initialSummary={summary} onRefresh={load} />}
    </div>
  )
}
