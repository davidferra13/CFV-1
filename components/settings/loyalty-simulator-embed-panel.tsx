'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  chefId: string
}

const PRESET_COLORS = ['#e88f47', '#2563eb', '#16a34a', '#dc2626', '#0891b2', '#1c1917']

function getWidgetOrigin() {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost') {
      return `http://localhost:${window.location.port || '3100'}`
    }

    return window.location.origin
  }

  return 'https://app.cheflowhq.com'
}

export function LoyaltySimulatorEmbedPanel({ chefId }: Props) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [accent, setAccent] = useState('#e88f47')
  const [copied, setCopied] = useState(false)
  const origin = getWidgetOrigin()

  const widgetUrl = `${origin}/embed/loyalty/${chefId}?theme=${theme}&accent=${encodeURIComponent(
    accent
  )}`
  const iframeCode = `<iframe\n  src="${widgetUrl}"\n  style="width:100%;min-height:1500px;border:none;border-radius:24px;"\n  title="Loyalty Program Simulator"\n  loading="lazy"\n></iframe>`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(iframeCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-6 rounded-xl border border-stone-700 bg-stone-900 p-5">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-stone-100">Loyalty Simulator Widget</h2>
        <p className="text-sm text-stone-400">
          Share an interactive rewards planner that uses your live tiers, earn rules, and reward
          catalog. Clients can test scenarios like dinner-for-two x five bookings and see exactly
          what unlocks.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-medium text-stone-200">Theme</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                theme === 'dark'
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-stone-700 text-stone-300 hover:border-stone-500'
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                theme === 'light'
                  ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                  : 'border-stone-700 text-stone-300 hover:border-stone-500'
              }`}
            >
              Light
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-stone-200">Accent</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setAccent(color)}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  accent === color ? 'scale-110 border-white' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                aria-label={`Accent ${color}`}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-stone-700 bg-stone-950 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-stone-200">Embed code</p>
            <p className="text-xs text-stone-500">
              Use an iframe on any site builder that accepts custom HTML.
            </p>
          </div>
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy iframe'}
          </Button>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-black/40 p-4 text-xs leading-relaxed text-emerald-300">
          {iframeCode}
        </pre>
        <div className="flex flex-wrap gap-3 text-xs text-stone-500">
          <a
            href={widgetUrl}
            target="_blank"
            rel="noreferrer"
            className="text-brand-400 hover:text-brand-300"
          >
            Open widget directly
          </a>
          <span>{widgetUrl}</span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-stone-200">Live preview</p>
        <div className="overflow-hidden rounded-xl border border-stone-700">
          <iframe
            src={widgetUrl}
            title="Loyalty simulator preview"
            style={{ width: '100%', minHeight: '1200px', border: 'none', display: 'block' }}
          />
        </div>
      </div>
    </div>
  )
}
