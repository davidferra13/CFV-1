'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  createSecret,
  updateSecret,
  revealSecret,
  cancelSecret,
  addSecretMessage,
  addSecretAsset,
  updateSecretAssetStatus,
} from '@/lib/secrets/actions'
import type {
  EventSecret,
  SecretType,
  SecretVisibilityScope,
  SecretStatus,
  SecretAssetType,
} from '@/lib/private-context/types'

const SECRET_TYPE_LABELS: Record<SecretType, string> = {
  menu_item: 'Menu Item',
  surprise_dish: 'Surprise Dish',
  gift: 'Gift',
  experience: 'Experience',
  moment: 'Moment',
}

const VISIBILITY_LABELS: Record<SecretVisibilityScope, string> = {
  chef_only: 'Chef Only',
  chef_and_selected: 'Chef + Selected',
  participant_only: 'Participant Only',
}

const STATUS_COLORS: Record<SecretStatus, 'default' | 'warning' | 'success' | 'info'> = {
  planning: 'warning',
  ready: 'info',
  revealed: 'success',
  cancelled: 'default',
}

interface Props {
  eventId: string
  secrets: EventSecret[]
}

export function SecretsPanel({ eventId, secrets }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    secret_type: 'surprise_dish' as SecretType,
    visibility_scope: 'chef_only' as SecretVisibilityScope,
    reveal_timing: '',
    estimated_cost_cents: '',
  })

  // Thread/asset forms
  const [threadMsg, setThreadMsg] = useState('')
  const [assetForm, setAssetForm] = useState({ description: '', asset_type: 'ingredient' as SecretAssetType, quantity: '' })

  function resetForm() {
    setFormData({
      title: '', description: '', secret_type: 'surprise_dish',
      visibility_scope: 'chef_only', reveal_timing: '', estimated_cost_cents: '',
    })
    setShowForm(false)
    setError(null)
  }

  function handleCreate() {
    if (!formData.title.trim()) return
    startTransition(async () => {
      try {
        const res = await createSecret({
          event_id: eventId,
          secret_type: formData.secret_type,
          title: formData.title,
          description: formData.description || null,
          visibility_scope: formData.visibility_scope,
          reveal_timing: formData.reveal_timing || null,
          estimated_cost_cents: formData.estimated_cost_cents ? parseInt(formData.estimated_cost_cents) : 0,
        })
        if (!res.success) throw new Error(res.error)
        resetForm()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create')
      }
    })
  }

  function handleStatusChange(id: string, action: 'ready' | 'revealed' | 'cancelled') {
    startTransition(async () => {
      try {
        if (action === 'revealed') await revealSecret(id)
        else if (action === 'cancelled') await cancelSecret(id)
        else await updateSecret(id, { status: action })
        router.refresh()
      } catch {
        // non-fatal
      }
    })
  }

  function handleAddMessage(secretId: string) {
    if (!threadMsg.trim()) return
    startTransition(async () => {
      try {
        await addSecretMessage({ secret_id: secretId, message: threadMsg })
        setThreadMsg('')
        router.refresh()
      } catch {
        // non-fatal
      }
    })
  }

  function handleAddAsset(secretId: string) {
    if (!assetForm.description.trim()) return
    startTransition(async () => {
      try {
        await addSecretAsset({
          secret_id: secretId,
          asset_type: assetForm.asset_type,
          description: assetForm.description,
          quantity: assetForm.quantity || null,
        })
        setAssetForm({ description: '', asset_type: 'ingredient', quantity: '' })
        router.refresh()
      } catch {
        // non-fatal
      }
    })
  }

  const activeSecrets = secrets.filter(s => s.status !== 'cancelled')
  const cancelledSecrets = secrets.filter(s => s.status === 'cancelled')

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
          Secrets & Surprises
        </h3>
        <Button
          variant="ghost"
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          disabled={isPending}
        >
          {showForm ? 'Cancel' : '+ New Secret'}
        </Button>
      </div>

      {showForm && (
        <div className="space-y-2 mb-4 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={formData.secret_type}
              onChange={e => setFormData(f => ({ ...f, secret_type: e.target.value as SecretType }))}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
            >
              {Object.entries(SECRET_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <select
              value={formData.visibility_scope}
              onChange={e => setFormData(f => ({ ...f, visibility_scope: e.target.value as SecretVisibilityScope }))}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200"
            >
              {Object.entries(VISIBILITY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            placeholder="Secret title"
            value={formData.title}
            onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500"
          />
          <textarea
            placeholder="Description..."
            value={formData.description}
            onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500 resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Reveal timing (e.g. 'after main course')"
              value={formData.reveal_timing}
              onChange={e => setFormData(f => ({ ...f, reveal_timing: e.target.value }))}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500"
            />
            <input
              type="number"
              placeholder="Est. cost (cents)"
              value={formData.estimated_cost_cents}
              onChange={e => setFormData(f => ({ ...f, estimated_cost_cents: e.target.value }))}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={resetForm} disabled={isPending}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Secret'}
            </Button>
          </div>
        </div>
      )}

      {activeSecrets.length === 0 && !showForm && (
        <p className="text-sm text-zinc-500 italic">No secrets planned. Surprises, gifts, and hidden moments live here.</p>
      )}

      <div className="space-y-2">
        {activeSecrets.map(secret => (
          <div
            key={secret.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expandedId === secret.id ? null : secret.id)}
              className="w-full p-3 text-left flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant={STATUS_COLORS[secret.status]}>{secret.status}</Badge>
                <Badge variant="default">{SECRET_TYPE_LABELS[secret.secret_type]}</Badge>
                <span className="text-sm font-medium text-zinc-200 truncate">{secret.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-zinc-500">
                  {VISIBILITY_LABELS[secret.visibility_scope]}
                </span>
                {secret.estimated_cost_cents > 0 && (
                  <span className="text-xs text-zinc-400">
                    ~${(secret.estimated_cost_cents / 100).toFixed(2)}
                  </span>
                )}
                <span className="text-zinc-600">{expandedId === secret.id ? '−' : '+'}</span>
              </div>
            </button>

            {expandedId === secret.id && (
              <div className="px-3 pb-3 space-y-3 border-t border-zinc-800">
                {secret.description && (
                  <p className="text-sm text-zinc-400 pt-2">{secret.description}</p>
                )}
                {secret.reveal_timing && (
                  <p className="text-xs text-zinc-500">Reveal: {secret.reveal_timing}</p>
                )}

                {/* Status actions */}
                <div className="flex gap-2">
                  {secret.status === 'planning' && (
                    <Button variant="ghost" onClick={() => handleStatusChange(secret.id, 'ready')} disabled={isPending}>
                      Mark Ready
                    </Button>
                  )}
                  {(secret.status === 'planning' || secret.status === 'ready') && (
                    <Button variant="primary" onClick={() => handleStatusChange(secret.id, 'revealed')} disabled={isPending}>
                      Reveal
                    </Button>
                  )}
                  {secret.status !== 'revealed' && secret.status !== 'cancelled' && (
                    <Button variant="danger" onClick={() => handleStatusChange(secret.id, 'cancelled')} disabled={isPending}>
                      Cancel
                    </Button>
                  )}
                </div>

                {/* Quick thread message */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a planning note..."
                    value={expandedId === secret.id ? threadMsg : ''}
                    onChange={e => setThreadMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddMessage(secret.id)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500"
                  />
                  <Button variant="ghost" onClick={() => handleAddMessage(secret.id)} disabled={isPending || !threadMsg.trim()}>
                    Send
                  </Button>
                </div>

                {/* Quick asset add */}
                <div className="flex gap-2">
                  <select
                    value={assetForm.asset_type}
                    onChange={e => setAssetForm(f => ({ ...f, asset_type: e.target.value as SecretAssetType }))}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
                  >
                    <option value="ingredient">Ingredient</option>
                    <option value="design">Design</option>
                    <option value="timing">Timing</option>
                    <option value="equipment">Equipment</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Asset description..."
                    value={assetForm.description}
                    onChange={e => setAssetForm(f => ({ ...f, description: e.target.value }))}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-500"
                  />
                  <Button variant="ghost" onClick={() => handleAddAsset(secret.id)} disabled={isPending || !assetForm.description.trim()}>
                    + Asset
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {cancelledSecrets.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-zinc-600 cursor-pointer">
            {cancelledSecrets.length} cancelled secret{cancelledSecrets.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-1 space-y-1">
            {cancelledSecrets.map(s => (
              <div key={s.id} className="text-xs text-zinc-600 line-through px-2">
                {s.title}
              </div>
            ))}
          </div>
        </details>
      )}
    </Card>
  )
}
