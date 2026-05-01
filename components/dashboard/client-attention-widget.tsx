'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, ArrowRight, Send } from '@/components/ui/icons'
import type { AttentionItem } from '@/app/(chef)/dashboard/_sections/client-attention-data'
import {
  sendQuickReply,
  sendBatchQuickReply,
  QUICK_REPLY_TEMPLATES,
} from '@/lib/communication/quick-reply-actions'
import { toast } from 'sonner'

// ── Helpers ──────────────────────────────────────────────────────────────────

function urgencyVariant(urgency: AttentionItem['urgency']): 'error' | 'warning' | 'default' {
  if (urgency === 'critical') return 'error'
  if (urgency === 'high') return 'warning'
  return 'default'
}

function daysLabel(days: number): string {
  if (days >= 999) return 'Never'
  if (days === 0) return 'Today'
  if (days === 1) return '1d'
  return `${days}d`
}

// ── Component ────────────────────────────────────────────────────────────────

type Props = {
  items: AttentionItem[]
}

export function ClientAttentionWidget({ items: initialItems }: Props) {
  const [items, setItems] = useState(initialItems)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [customMsg, setCustomMsg] = useState('')
  const [selectedBatch, setSelectedBatch] = useState<Set<string>>(new Set())
  const [batchTemplateId, setBatchTemplateId] = useState(QUICK_REPLY_TEMPLATES[0].id)
  const [isPending, startTransition] = useTransition()
  if (items.length === 0) return null

  const criticalCount = items.filter((i) => i.urgency === 'critical').length
  const batchMode = selectedBatch.size > 0

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id)
    setCustomMsg('')
  }

  function toggleBatchSelect(id: string) {
    setSelectedBatch((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSendTemplate(item: AttentionItem, templateId: string) {
    startTransition(async () => {
      try {
        const result = await sendQuickReply({
          inquiryId: item.id,
          clientEmail: item.clientEmail || '',
          clientName: item.clientName,
          occasion: item.occasion,
          templateId,
        })
        if (result.success) {
          toast.success(`Sent to ${item.clientName}`)
          setItems((prev) => prev.filter((i) => i.id !== item.id))
          setExpandedId(null)
        } else {
          toast.error(`Send failed: ${result.error}`)
        }
      } catch {
        toast.error('Send failed: unexpected error')
      }
    })
  }

  function handleSendCustom(item: AttentionItem) {
    if (!customMsg.trim()) return
    startTransition(async () => {
      try {
        const result = await sendQuickReply({
          inquiryId: item.id,
          clientEmail: item.clientEmail || '',
          clientName: item.clientName,
          occasion: item.occasion,
          customMessage: customMsg,
        })
        if (result.success) {
          toast.success(`Sent to ${item.clientName}`)
          setItems((prev) => prev.filter((i) => i.id !== item.id))
          setExpandedId(null)
          setCustomMsg('')
        } else {
          toast.error(`Send failed: ${result.error}`)
        }
      } catch {
        toast.error('Send failed: unexpected error')
      }
    })
  }

  function handleBatchSend() {
    const batchItems = items.filter((i) => selectedBatch.has(i.id) && i.clientEmail)
    if (batchItems.length === 0) return
    startTransition(async () => {
      try {
        const result = await sendBatchQuickReply(
          batchItems.map((i) => ({
            inquiryId: i.id,
            clientEmail: i.clientEmail || '',
            clientName: i.clientName,
            occasion: i.occasion,
          })),
          batchTemplateId
        )
        if (result.sent > 0) {
          const msg = `Sent ${result.sent} update${result.sent > 1 ? 's' : ''}${result.failed > 0 ? `, ${result.failed} failed` : ''}`
          toast.success(msg)
          // Remove successfully sent items
          setItems((prev) => prev.filter((i) => !selectedBatch.has(i.id)))
          setSelectedBatch(new Set())
        } else {
          toast.error(`All sends failed: ${result.errors[0]}`)
        }
      } catch {
        toast.error('Batch send failed')
      }
    })
  }

  return (
    <div data-cf-surface="chef:client-attention-widget">
      <div
        className="rounded-2xl border border-white/[0.07] overflow-hidden"
        style={{
          borderLeft:
            criticalCount > 0 ? '4px solid rgb(248, 113, 113)' : '4px solid rgb(251, 191, 36)',
          background: 'rgba(28, 25, 23, 0.6)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-stone-400" weight="bold" />
            <span className="text-sm font-semibold text-stone-100">Clients Waiting on You</span>
            <Badge variant={criticalCount > 0 ? 'error' : 'warning'}>{items.length}</Badge>
          </div>
          <div className="flex items-center gap-3">
            {batchMode && (
              <div className="flex items-center gap-2">
                <select
                  value={batchTemplateId}
                  onChange={(e) => setBatchTemplateId(e.target.value)}
                  title="Select message template"
                  className="text-xs bg-stone-800 border border-stone-700 rounded px-2 py-1 text-stone-300"
                >
                  {QUICK_REPLY_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="primary"
                  onClick={handleBatchSend}
                  disabled={isPending}
                  className="h-7 text-xs px-3"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Send to {selectedBatch.size}
                </Button>
                <button
                  type="button"
                  onClick={() => setSelectedBatch(new Set())}
                  className="text-xs text-stone-500 hover:text-stone-300"
                >
                  Cancel
                </button>
              </div>
            )}
            <Link
              href="/inbox"
              className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-400 transition-colors"
            >
              Inbox <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* List */}
        <div className="px-4 pb-3 space-y-1">
          {items.map((item) => {
            const isExpanded = expandedId === item.id
            const noEmail = !item.clientEmail

            return (
              <div key={item.id}>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-white/[0.05] transition-all group">
                  {/* Batch checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedBatch.has(item.id)}
                    onChange={() => toggleBatchSelect(item.id)}
                    disabled={noEmail}
                    title={`Select ${item.clientName}`}
                    className="h-3.5 w-3.5 rounded border-stone-600 bg-stone-800 text-brand-500 focus:ring-brand-500/30 shrink-0"
                  />

                  {/* Client info (click to expand reply panel) */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.id)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    disabled={noEmail}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-stone-200 truncate group-hover:text-stone-100">
                          {item.clientName}
                        </p>
                        {item.occasion && (
                          <span className="text-xs text-stone-500 truncate hidden sm:inline">
                            {item.occasion}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {item.reason}
                        {noEmail && ' (no email)'}
                      </p>
                    </div>
                  </button>

                  {/* Days badge + inquiry link */}
                  <Badge variant={urgencyVariant(item.urgency)} className="shrink-0">
                    {daysLabel(item.daysSilent)}
                  </Badge>
                  <Link
                    href={item.href}
                    className="text-xs text-stone-500 hover:text-stone-300 shrink-0"
                    title="View inquiry"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Expanded: template picker + custom message */}
                {isExpanded && (
                  <div className="ml-9 mr-3 mb-2 mt-1 p-3 rounded-lg bg-stone-800/50 border border-stone-700/50 space-y-3">
                    {/* Template buttons */}
                    <div className="flex flex-wrap gap-2">
                      {QUICK_REPLY_TEMPLATES.map((t) => (
                        <Button
                          key={t.id}
                          variant="secondary"
                          onClick={() => handleSendTemplate(item, t.id)}
                          disabled={isPending}
                          className="h-7 text-xs"
                        >
                          {t.label}
                        </Button>
                      ))}
                    </div>

                    {/* Custom message */}
                    <div className="flex gap-2">
                      <textarea
                        value={customMsg}
                        onChange={(e) => setCustomMsg(e.target.value)}
                        placeholder="Or type a custom message..."
                        rows={2}
                        className="flex-1 text-sm bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 placeholder:text-stone-600 resize-none focus:outline-none focus:border-brand-500/50"
                      />
                      <Button
                        variant="primary"
                        onClick={() => handleSendCustom(item)}
                        disabled={isPending || !customMsg.trim()}
                        className="h-auto px-3 self-end"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
