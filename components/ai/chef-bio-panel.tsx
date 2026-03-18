'use client'

import { useState } from 'react'
import { UserCircle, Copy, Sparkles } from '@/components/ui/icons'
import { TaskLoader } from '@/components/ui/task-loader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { generateChefBioDraft, type ChefBioDraft } from '@/lib/ai/chef-bio'
import { toast } from 'sonner'

export function ChefBioPanel() {
  const [result, setResult] = useState<ChefBioDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'short' | 'long' | 'tagline'>('tagline')

  async function run() {
    setLoading(true)
    try {
      const data = await generateChefBioDraft()
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bio generation failed')
    } finally {
      setLoading(false)
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Copied')
  }

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCircle className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-300">Chef Bio & Tagline</span>
            <Badge variant="info">Auto</Badge>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <TaskLoader contextId="ai-chef-bio" />
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Generate Bio
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Fresh bio copy and tagline based on your recent events, specialties, and milestones.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCircle className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-300">Chef Bio & Tagline</span>
          <Badge variant="warning">Draft</Badge>
        </div>
        <div className="flex items-center gap-1">
          {(['tagline', 'short', 'long'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-2 py-1 rounded capitalize ${view === v ? 'bg-stone-800 font-medium' : 'text-stone-500'}`}
            >
              {v}
            </button>
          ))}
          <Button variant="ghost" onClick={run} disabled={loading}>
            {loading ? <TaskLoader message="Regenerating..." iconSize={12} /> : 'Redo'}
          </Button>
        </div>
      </div>

      {view === 'tagline' && (
        <div className="space-y-2">
          <div className="bg-brand-950 border border-brand-700 rounded p-3">
            <div className="text-xs-tight text-brand-600 mb-0.5">Primary Tagline</div>
            <div className="text-lg font-medium text-stone-200">{result.tagline}</div>
          </div>
          <div className="space-y-1">
            {result.alternativeTaglines.map((t, i) => (
              <div key={i} className="flex items-center justify-between bg-stone-800 rounded p-2">
                <span className="text-sm text-stone-300">{t}</span>
                <Button variant="ghost" onClick={() => copy(t)}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="text-xs text-stone-400 border-t border-stone-800 pt-2">
            <span className="font-medium">LinkedIn headline:</span> {result.linkedInHeadline}
          </div>
          <Button variant="secondary" onClick={() => copy(result.tagline)}>
            <Copy className="w-3 h-3 mr-1" />
            Copy Primary Tagline
          </Button>
        </div>
      )}

      {view === 'short' && (
        <div className="space-y-2">
          <div className="text-sm text-stone-300 leading-relaxed">{result.shortBio}</div>
          <Button variant="secondary" onClick={() => copy(result.shortBio)}>
            <Copy className="w-3 h-3 mr-1" />
            Copy Short Bio
          </Button>
        </div>
      )}

      {view === 'long' && (
        <div className="space-y-2">
          <div className="text-sm text-stone-300 leading-relaxed">{result.longBio}</div>
          <Button variant="secondary" onClick={() => copy(result.longBio)}>
            <Copy className="w-3 h-3 mr-1" />
            Copy Long Bio
          </Button>
        </div>
      )}

      <p className="text-xs-tight text-stone-400">Auto draft · Edit before publishing</p>
    </div>
  )
}
