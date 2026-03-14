'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createFollowupRule, toggleFollowupRule } from '@/lib/followup/rule-actions'
import { Zap, Plus, Power } from 'lucide-react'
import { toast } from 'sonner'

type FollowupRule = {
  id: string
  triggerType: string
  delayDays: number
  templateId: string
  templateName?: string
  isActive: boolean
}

type Props = {
  initialRules: FollowupRule[]
  templates: { id: string; name: string }[]
}

const TRIGGER_LABELS: Record<string, string> = {
  proposal_sent: 'Proposal Sent',
  proposal_viewed: 'Proposal Viewed',
  booking_confirmed: 'Booking Confirmed',
  event_completed: 'Event Completed',
  dormant: 'Client Dormant',
}

const TRIGGER_BADGES: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  proposal_sent: 'info',
  proposal_viewed: 'info',
  booking_confirmed: 'success',
  event_completed: 'success',
  dormant: 'warning',
}

export function RuleBuilder({ initialRules, templates }: Props) {
  const [rules, setRules] = useState(initialRules)
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    triggerType: 'proposal_sent',
    delayDays: 3,
    templateId: '',
  })

  function handleCreate() {
    startTransition(async () => {
      try {
        const created = await createFollowupRule({
          triggerType: form.triggerType as any,
          delayDays: form.delayDays,
          templateId: form.templateId,
          isActive: true,
        })
        setRules((prev) => [...prev, created])
        setShowCreate(false)
        setForm({ triggerType: 'proposal_sent', delayDays: 3, templateId: '' })
      } catch (err) {
        toast.error('Failed to create follow-up rule')
      }
    })
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      try {
        await toggleFollowupRule(id, !isActive)
        setRules((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: !isActive } : r)))
      } catch (err) {
        toast.error('Failed to toggle rule')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Follow-Up Rules</h2>
          <p className="text-sm text-stone-500">
            {rules.filter((r) => r.isActive).length} active rules
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New Rule
        </Button>
      </div>

      {showCreate && (
        <Card className="border-stone-600">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Create Follow-Up Rule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">Trigger</label>
              <select
                value={form.triggerType}
                onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Delay (days after trigger)"
              type="number"
              min="0"
              max="365"
              value={form.delayDays.toString()}
              onChange={(e) => setForm({ ...form, delayDays: parseInt(e.target.value || '0') })}
            />
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Email Template
              </label>
              <select
                value={form.templateId}
                onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                <option value="">Select template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleCreate}
                loading={isPending}
                disabled={!form.templateId}
              >
                Create Rule
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rule List */}
      <div className="space-y-2">
        {rules.map((rule) => (
          <Card key={rule.id} className={!rule.isActive ? 'opacity-60' : ''}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap
                    className={`h-4 w-4 ${rule.isActive ? 'text-amber-500' : 'text-stone-300'}`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={TRIGGER_BADGES[rule.triggerType] || 'default'}>
                        {TRIGGER_LABELS[rule.triggerType] || rule.triggerType}
                      </Badge>
                      <span className="text-sm text-stone-400">
                        → Wait {rule.delayDays} day{rule.delayDays !== 1 ? 's' : ''} → Send email
                      </span>
                    </div>
                    {rule.templateName && (
                      <p className="text-xs text-stone-400 mt-0.5">Template: {rule.templateName}</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={rule.isActive ? 'secondary' : 'ghost'}
                  onClick={() => handleToggle(rule.id, rule.isActive)}
                  disabled={isPending}
                >
                  <Power className="h-3.5 w-3.5" />
                  {rule.isActive ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rules.length === 0 && !showCreate && (
        <div className="text-center py-8">
          <Zap className="h-12 w-12 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-500">
            No follow-up rules yet. Create automatic follow-ups for key events.
          </p>
        </div>
      )}
    </div>
  )
}
