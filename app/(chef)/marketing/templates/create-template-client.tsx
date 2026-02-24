'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createCampaignTemplate } from '@/lib/marketing/actions'
import { CAMPAIGN_TYPE_LABELS } from '@/lib/marketing/constants'

export function CreateTemplateClient() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    campaign_type: 're_engagement',
    subject: '',
    body_html: '',
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createCampaignTemplate(form)
      router.refresh()
      setForm({ name: '', campaign_type: 're_engagement', subject: '', body_html: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-stone-400 mb-1">Template name *</label>
          <Input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="My re-engagement"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Type</label>
          <select
            title="Campaign type"
            className="w-full rounded-md border border-stone-700 bg-surface px-3 py-2 text-sm"
            value={form.campaign_type}
            onChange={(e) => update('campaign_type', e.target.value)}
          >
            {Object.entries(CAMPAIGN_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-400 mb-1">Subject *</label>
          <Input
            value={form.subject}
            onChange={(e) => update('subject', e.target.value)}
            placeholder="Hi {{first_name}}, it's been a while"
            required
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-stone-400 mb-1">Body *</label>
          <textarea
            className="w-full rounded-md border border-stone-700 bg-surface px-3 py-2 text-sm min-h-[120px] resize-y font-mono"
            value={form.body_html}
            onChange={(e) => update('body_html', e.target.value)}
            placeholder={`Hi {{first_name}},\n\nYour message here.\n\n{{chef_name}}`}
            required
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" disabled={saving || !form.name.trim()}>
        {saving ? 'Saving…' : 'Save template'}
      </Button>
    </form>
  )
}
