'use client'

import { useState } from 'react'
import type { ResponseTemplate } from '@/lib/communication/templates/actions'
import { TemplateEditor } from './template-editor'

type Props = {
  templates: ResponseTemplate[]
  chefId: string
}

const CATEGORY_LABELS: Record<string, string> = {
  auto_response: 'Auto-Response',
  follow_up: 'Follow-Up',
  menu_proposal: 'Menu Proposal',
  booking_confirmation: 'Booking Confirmation',
  payment_reminder: 'Payment Reminder',
  post_event: 'Post-Event',
  pre_event: 'Pre-Event',
  general: 'General',
  onboarding: 'Onboarding',
  re_engagement: 'Re-engagement',
}

export function TemplateList({ templates, chefId }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Group by category
  const grouped = templates.reduce(
    (acc, t) => {
      if (!acc[t.category]) acc[t.category] = []
      acc[t.category].push(t)
      return acc
    },
    {} as Record<string, ResponseTemplate[]>
  )

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-stone-100">Response Templates</h2>
        <button
          onClick={() => setCreating(true)}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium"
        >
          + New Template
        </button>
      </div>

      <p className="text-stone-400 text-sm mb-4">
        Reusable templates for auto-responses, follow-ups, proposals, and more. Use {'{{'}variables
        {'}}'} to personalize each message automatically.
      </p>

      {creating && (
        <div className="mb-4">
          <TemplateEditor template={null} onClose={() => setCreating(false)} chefId={chefId} />
        </div>
      )}

      {Object.entries(grouped).map(([category, categoryTemplates]) => (
        <div key={category} className="mb-4">
          <h3 className="text-sm font-medium text-stone-400 mb-2">
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          <div className="space-y-2">
            {categoryTemplates.map((t) => (
              <div key={t.id}>
                {editing === t.id ? (
                  <TemplateEditor template={t} onClose={() => setEditing(null)} chefId={chefId} />
                ) : (
                  <div
                    onClick={() => setEditing(t.id)}
                    className="flex items-center justify-between p-3 bg-stone-800 border border-stone-700 rounded cursor-pointer hover:border-stone-600 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-200">{t.name}</span>
                        {t.is_default && (
                          <span className="text-xs bg-amber-900/50 text-amber-400 px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5 truncate max-w-md">{t.subject}</p>
                    </div>
                    <div className="text-xs text-stone-500">
                      {t.usage_count > 0 && `Used ${t.usage_count}x`}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {templates.length === 0 && !creating && (
        <p className="text-stone-500 text-sm text-center py-8">
          No templates yet. Create your first one or enable auto-response to get started with
          defaults.
        </p>
      )}
    </div>
  )
}
