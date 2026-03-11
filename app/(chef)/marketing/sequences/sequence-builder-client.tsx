'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createSequence } from '@/lib/marketing/actions'
import { AVAILABLE_TOKENS } from '@/lib/marketing/tokens'

type Step = {
  step_number: number
  delay_days: number
  subject: string
  body_html: string
}

const TRIGGER_OPTIONS = [
  { value: 'birthday', label: 'Birthday — fires N days before client birthday' },
  { value: 'dormant_90', label: 'Re-engagement — fires when client hits 90 days dormant' },
  { value: 'post_event', label: 'Post-event — fires N days after event completes' },
]

export function SequenceBuilderClient() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState('birthday')
  const [daysBefore, setDaysBefore] = useState(7)
  const [steps, setSteps] = useState<Step[]>([
    { step_number: 1, delay_days: 0, subject: '', body_html: '' },
  ])

  function updateStep(index: number, field: keyof Step, value: string | number) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  function addStep() {
    const lastDelay = steps[steps.length - 1]?.delay_days ?? 0
    setSteps((prev) => [
      ...prev,
      { step_number: prev.length + 1, delay_days: lastDelay + 7, subject: '', body_html: '' },
    ])
  }

  function removeStep(index: number) {
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_number: i + 1 }))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (steps.some((s) => !s.subject || !s.body_html)) {
      setError('All steps need a subject and body.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createSequence({
        name,
        trigger_type: triggerType as any,
        days_before_trigger: daysBefore,
        steps,
      })
      router.refresh()
      setName('')
      setTriggerType('birthday')
      setDaysBefore(7)
      setSteps([{ step_number: 1, delay_days: 0, subject: '', body_html: '' }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sequence')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name + trigger */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-stone-400 mb-1">Sequence name *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Birthday greetings"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Trigger</label>
          <select
            title="Trigger type"
            className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm"
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
          >
            {TRIGGER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {triggerType === 'birthday' && (
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">
              Days before birthday
            </label>
            <Input
              type="number"
              min={1}
              max={30}
              value={daysBefore}
              onChange={(e) => setDaysBefore(parseInt(e.target.value, 10))}
            />
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Email steps</p>
          <p className="text-xs text-stone-400">
            Tokens: {AVAILABLE_TOKENS.map((t) => t.token).join(', ')}
          </p>
        </div>

        {steps.map((step, i) => (
          <div key={i} className="rounded-lg border border-stone-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-stone-300">Step {step.step_number}</p>
              {steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="text-xs text-red-500 hover:text-red-200"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  {i === 0 ? 'Delay from trigger (days)' : 'Delay from previous (days)'}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={step.delay_days}
                  onChange={(e) => updateStep(i, 'delay_days', parseInt(e.target.value, 10))}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-400 mb-1">Subject *</label>
                <Input
                  value={step.subject}
                  onChange={(e) => updateStep(i, 'subject', e.target.value)}
                  placeholder="Happy birthday, {{first_name}}!"
                  required
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-stone-400 mb-1">Body *</label>
                <textarea
                  className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm min-h-[100px] resize-y font-mono"
                  value={step.body_html}
                  onChange={(e) => updateStep(i, 'body_html', e.target.value)}
                  placeholder={`Hi {{first_name}},\n\nWrite your message here.\n\n{{chef_name}}`}
                  required
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addStep}
          className="text-xs text-stone-500 hover:text-stone-300 underline"
        >
          + Add another step
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <Button type="submit" disabled={saving || !name.trim()}>
        {saving ? 'Creating…' : 'Create sequence'}
      </Button>
    </form>
  )
}
