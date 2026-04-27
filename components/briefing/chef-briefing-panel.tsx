'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Printer, Copy, RefreshCw, AlertTriangle } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { generateEventBriefing } from '@/lib/briefing/generate-briefing'
import type { BriefingDocument, BriefingFallback, BriefingRedFlag } from '@/lib/briefing/types'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RedFlagItem({ flag }: { flag: BriefingRedFlag }) {
  return (
    <div
      className={`flex items-start gap-2 p-2 rounded text-sm ${
        flag.severity === 'critical'
          ? 'bg-red-950/50 border border-red-800/50'
          : 'bg-amber-950/50 border border-amber-800/50'
      }`}
    >
      <AlertTriangle
        className={`w-4 h-4 mt-0.5 shrink-0 ${
          flag.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
        }`}
      />
      <div>
        <span
          className={`font-medium ${
            flag.severity === 'critical' ? 'text-red-300' : 'text-amber-300'
          }`}
        >
          {flag.label}
        </span>
        <p className="text-stone-400 text-xs mt-0.5">{flag.details}</p>
      </div>
    </div>
  )
}

function BriefingSection({
  title,
  content,
  color = 'text-stone-300',
}: {
  title: string
  content: string
  color?: string
}) {
  if (!content || content === 'No data available') return null
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
        {title}
      </h4>
      <p className={`text-sm ${color} leading-relaxed`}>{content}</p>
    </div>
  )
}

function FallbackView({ context }: { context: BriefingFallback['context'] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-2 bg-amber-950/30 border border-amber-800/40 rounded text-xs text-amber-300">
        <AlertTriangle className="w-3 h-3" />
        AI unavailable. Showing raw event data.
      </div>
      <div className="space-y-2 text-sm text-stone-300">
        <div>
          <span className="text-stone-500">Client: </span>
          {context.client?.name || 'Unknown'}
        </div>
        <div>
          <span className="text-stone-500">Guests: </span>
          {context.event.guestCount ?? 'TBD'}
        </div>
        <div>
          <span className="text-stone-500">Service: </span>
          {context.event.serviceStyle || 'TBD'}
        </div>
        {context.event.allergies.length > 0 && (
          <div>
            <span className="text-red-400 font-medium">Allergies: </span>
            {context.event.allergies.join(', ')}
          </div>
        )}
        {context.event.dietaryRestrictions.length > 0 && (
          <div>
            <span className="text-amber-400 font-medium">Dietary: </span>
            {context.event.dietaryRestrictions.join(', ')}
          </div>
        )}
        {context.clientMemories.length > 0 && (
          <div>
            <span className="text-stone-500">Memories: </span>
            {context.clientMemories.map((m) => `${m.key}: ${String(m.value)}`).join('; ')}
          </div>
        )}
        {context.pastEvents.length > 0 && (
          <div>
            <span className="text-stone-500">Past events: </span>
            {context.pastEvents.length} completed
          </div>
        )}
        <div>
          <span className="text-stone-500">Paid: </span>$
          {(context.financial.totalPaidCents / 100).toFixed(2)}
          {context.financial.outstandingBalanceCents > 0 && (
            <span className="text-amber-400 ml-2">
              Outstanding: ${(context.financial.outstandingBalanceCents / 100).toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

export function ChefBriefingPanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<BriefingDocument | BriefingFallback | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await generateEventBriefing(eventId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Briefing generation failed')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    if (!result || 'type' in result) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(
      `<html><head><title>Event Briefing</title></head><body><pre style="font-family:monospace;font-size:12px;line-height:1.6;max-width:700px;margin:40px auto;white-space:pre-wrap">${result.fullDocument}</pre></body></html>`
    )
    w.document.close()
    w.print()
  }

  function handleCopy() {
    if (!result || 'type' in result) return
    navigator.clipboard.writeText(result.fullDocument).then(
      () => toast.success('Briefing copied'),
      () => toast.error('Copy failed')
    )
  }

  // Not generated yet
  if (!result) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-300">Pre-Event Briefing</span>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Generate Briefing
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-2">
          AI-synthesized intelligence report: client memory, dietary risks, prep status, logistics,
          talking points.
        </p>
      </Card>
    )
  }

  // Fallback (AI offline)
  if ('type' in result && result.type === 'fallback') {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-stone-300">Pre-Event Briefing</span>
            <Badge variant="warning">Fallback</Badge>
          </div>
          <Button variant="ghost" onClick={run} disabled={loading} className="text-xs">
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
        <FallbackView context={result.context} />
      </Card>
    )
  }

  // Full briefing
  const doc = result as BriefingDocument
  const { sections } = doc

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-200">Pre-Event Briefing</span>
          <Badge variant="info" className="text-xs">
            {new Date(doc.generatedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" onClick={handlePrint} className="text-xs h-7 px-2">
            <Printer className="w-3 h-3 mr-1" />
            Print
          </Button>
          <Button variant="ghost" onClick={handleCopy} className="text-xs h-7 px-2">
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
          <Button variant="ghost" onClick={run} disabled={loading} className="text-xs h-7 px-2">
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Red flags first */}
      {sections.redFlags.length > 0 && (
        <div className="space-y-2 mb-4">
          {sections.redFlags.map((flag, i) => (
            <RedFlagItem key={i} flag={flag} />
          ))}
        </div>
      )}

      <div className="space-y-4">
        <BriefingSection title="Client Recap" content={sections.clientRecap} />
        <BriefingSection title="Event Vitals" content={sections.eventVitals} />
        <BriefingSection
          title="Dietary Risk Summary"
          content={sections.dietaryRiskSummary}
          color="text-red-300"
        />
        <BriefingSection title="Menu Intelligence" content={sections.menuIntelligence} />
        <BriefingSection title="Client History" content={sections.clientHistory} />
        <BriefingSection title="Logistics" content={sections.logistics} />
        <BriefingSection title="Financial Context" content={sections.financialContext} />
        <BriefingSection title="Prep Status" content={sections.prepStatus} />

        {sections.talkingPoints.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
              Talking Points
            </h4>
            <ul className="space-y-1">
              {sections.talkingPoints.map((tp, i) => (
                <li key={i} className="text-sm text-stone-300 flex items-start gap-2">
                  <span className="text-stone-600 shrink-0">-</span>
                  {tp}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}
