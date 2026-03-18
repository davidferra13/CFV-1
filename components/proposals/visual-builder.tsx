'use client'

import { useState, useTransition } from 'react'
import NextImage from 'next/image'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createProposalTemplate, type ProposalTemplate } from '@/lib/proposals/template-actions'
import { FileText, Image as ImageIcon, Plus } from '@/components/ui/icons'
import { toast } from 'sonner'

type Props = {
  templates: ProposalTemplate[]
  menus: { id: string; name: string }[]
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function VisualBuilder({ templates, menus }: Props) {
  const [items, setItems] = useState(templates)
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    name: '',
    coverPhotoUrl: '',
    description: '',
    defaultMenuId: '',
    basePriceCents: 0,
    includedServices: '' as string,
  })

  function handleCreate() {
    startTransition(async () => {
      try {
        const services = form.includedServices
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        const created = await createProposalTemplate({
          name: form.name,
          coverPhotoUrl: form.coverPhotoUrl || undefined,
          description: form.description || undefined,
          defaultMenuId: form.defaultMenuId || undefined,
          basePriceCents: form.basePriceCents,
          includedServices: services as unknown as Record<string, unknown>,
        })
        setItems((prev) => [...prev, created])
        setShowCreate(false)
        setForm({
          name: '',
          coverPhotoUrl: '',
          description: '',
          defaultMenuId: '',
          basePriceCents: 0,
          includedServices: '',
        })
      } catch (err) {
        toast.error('Failed to create template')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-100">Proposal Templates</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {showCreate && (
        <Card className="border-stone-600">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Create Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              label="Template Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Dinner Party Package"
              required
            />
            <Input
              label="Cover Photo URL"
              value={form.coverPhotoUrl}
              onChange={(e) => setForm({ ...form, coverPhotoUrl: e.target.value })}
              placeholder="https://..."
            />
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
                rows={3}
                placeholder="Describe what this package includes..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Default Menu
              </label>
              <select
                value={form.defaultMenuId}
                onChange={(e) => setForm({ ...form, defaultMenuId: e.target.value })}
                className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {menus.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Base Price ($)"
              type="number"
              min="0"
              step="0.01"
              value={(form.basePriceCents / 100).toString()}
              onChange={(e) =>
                setForm({
                  ...form,
                  basePriceCents: Math.round(parseFloat(e.target.value || '0') * 100),
                })
              }
            />
            <Input
              label="Included Services (comma separated)"
              value={form.includedServices}
              onChange={(e) => setForm({ ...form, includedServices: e.target.value })}
              placeholder="e.g., Cooking, Serving, Cleanup"
            />
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleCreate} loading={isPending} disabled={!form.name}>
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((t) => (
          <Card key={t.id} className="overflow-hidden">
            {t.coverPhotoUrl ? (
              <div className="relative h-32 bg-stone-800 overflow-hidden">
                <NextImage
                  src={t.coverPhotoUrl}
                  alt={t.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-32 bg-stone-800 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-stone-300" />
              </div>
            )}
            <CardContent className="py-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-stone-100">{t.name}</h3>
                  {t.description && (
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2">{t.description}</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-brand-600">
                  {formatCents(t.basePriceCents)}
                </span>
              </div>
              {Array.isArray(t.includedServices) && (t.includedServices as string[]).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(t.includedServices as string[]).map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-stone-800 text-stone-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && !showCreate && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-500">
            No templates yet. Create your first proposal template.
          </p>
        </div>
      )}
    </div>
  )
}
