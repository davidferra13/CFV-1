'use client'

import { useState } from 'react'
import { Users, Printer, Copy, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { generateAIStaffBriefing, type AIStaffBriefing } from '@/lib/ai/staff-briefing-ai'
import { toast } from 'sonner'

export function StaffBriefingAIPanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<AIStaffBriefing | null>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'sections' | 'full'>('full')

  async function run() {
    setLoading(true)
    try {
      const data = await generateAIStaffBriefing(eventId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Briefing generation failed')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    if (!result) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(
      `<html><body><pre style="font-family:monospace;font-size:12px;line-height:1.6;max-width:700px;margin:40px auto">${result.fullDocument}</pre></body></html>`
    )
    w.document.close()
    w.print()
  }

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-300">Staff Briefing Draft</span>
            <Badge variant="info">Auto</Badge>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Drafting...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Generate Briefing
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Staff briefing: service protocol, menu narrative, allergen alerts, timings.
        </p>
      </div>
    )
  }

  const sections = [
    { label: 'Opening', content: result.openingParagraph },
    { label: 'Service Protocol', content: result.serviceProtocol },
    { label: 'Menu', content: result.menuNarrative },
    { label: 'Client Vibe', content: result.clientVibeNotes },
    { label: 'ALLERGENS', content: result.allergenAlerts },
    { label: 'Timings', content: result.keyTimings },
    { label: 'Dress & Presentation', content: result.dresscodeAndPresentation },
    { label: 'Cleanup', content: result.cleanupProtocol },
    { label: 'Closing Note', content: result.closingNote },
  ]

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-300">{result.subject}</span>
          <Badge variant="warning">Draft</Badge>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('full')}
            className={`text-xs px-2 py-1 rounded ${view === 'full' ? 'bg-stone-800 font-medium' : 'text-stone-500'}`}
          >
            Full
          </button>
          <button
            onClick={() => setView('sections')}
            className={`text-xs px-2 py-1 rounded ${view === 'sections' ? 'bg-stone-800 font-medium' : 'text-stone-500'}`}
          >
            Sections
          </button>
          <Button variant="ghost" onClick={handlePrint}>
            <Printer className="w-3 h-3 mr-1" />
            Print
          </Button>
          <Button variant="ghost" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Redo'}
          </Button>
        </div>
      </div>

      {view === 'full' && (
        <pre className="text-xs text-stone-300 whitespace-pre-wrap bg-stone-800 rounded p-3 max-h-72 overflow-y-auto font-sans leading-relaxed">
          {result.fullDocument}
        </pre>
      )}

      {view === 'sections' && (
        <div className="space-y-2">
          {sections.map((s, i) => (
            <div
              key={i}
              className={`rounded p-2 ${s.label === 'ALLERGENS' ? 'bg-red-950 border border-red-200' : 'bg-stone-800'}`}
            >
              <div
                className={`text-[11px] font-medium mb-0.5 ${s.label === 'ALLERGENS' ? 'text-red-700' : 'text-stone-500'}`}
              >
                {s.label}
              </div>
              <div className="text-xs text-stone-300 whitespace-pre-wrap">{s.content}</div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-stone-400">
        Draft · Review before sharing with staff — edit allergen section with extra care
      </p>
    </div>
  )
}
