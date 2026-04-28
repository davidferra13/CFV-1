'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  getSecretFull,
  addSecretMessage,
  addSecretAsset,
  updateSecretAssetStatus,
  deleteSecretAsset,
  updateSecret,
} from '@/lib/secrets/actions'
import type {
  EventSecretFull,
  SecretAssetType,
  SecretAssetStatus,
} from '@/lib/private-context/types'

const ASSET_STATUS_COLORS: Record<SecretAssetStatus, 'warning' | 'info' | 'success'> = {
  needed: 'warning',
  sourced: 'info',
  ready: 'success',
}

interface Props {
  secretId: string
  onClose: () => void
}

export function SecretDetailView({ secretId, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [secret, setSecret] = useState<EventSecretFull | null>(null)
  const [loading, setLoading] = useState(true)

  // Thread input
  const [threadMsg, setThreadMsg] = useState('')

  // Asset input
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [assetForm, setAssetForm] = useState({
    description: '',
    asset_type: 'ingredient' as SecretAssetType,
    quantity: '',
    estimated_cost_cents: '',
  })

  // Execution notes
  const [executionNotes, setExecutionNotes] = useState('')
  const [showExecNotes, setShowExecNotes] = useState(false)

  useEffect(() => {
    loadSecret()
  }, [secretId])

  async function loadSecret() {
    setLoading(true)
    const data = await getSecretFull(secretId)
    setSecret(data)
    setExecutionNotes(data?.execution_notes ?? '')
    setLoading(false)
  }

  function handleSendMessage() {
    if (!threadMsg.trim()) return
    startTransition(async () => {
      await addSecretMessage({ secret_id: secretId, message: threadMsg })
      setThreadMsg('')
      await loadSecret()
    })
  }

  function handleAddAsset() {
    if (!assetForm.description.trim()) return
    startTransition(async () => {
      await addSecretAsset({
        secret_id: secretId,
        asset_type: assetForm.asset_type,
        description: assetForm.description,
        quantity: assetForm.quantity || null,
        estimated_cost_cents: assetForm.estimated_cost_cents ? parseInt(assetForm.estimated_cost_cents) : 0,
      })
      setAssetForm({ description: '', asset_type: 'ingredient', quantity: '', estimated_cost_cents: '' })
      setShowAssetForm(false)
      await loadSecret()
    })
  }

  function handleAssetStatusChange(assetId: string, status: SecretAssetStatus) {
    startTransition(async () => {
      await updateSecretAssetStatus(assetId, status)
      await loadSecret()
    })
  }

  function handleDeleteAsset(assetId: string) {
    startTransition(async () => {
      await deleteSecretAsset(assetId)
      await loadSecret()
    })
  }

  function handleSaveExecutionNotes() {
    startTransition(async () => {
      await updateSecret(secretId, { execution_notes: executionNotes })
      setShowExecNotes(false)
      router.refresh()
    })
  }

  if (loading) {
    return (
      <Card className="p-4">
        <p className="text-sm text-zinc-500 animate-pulse">Loading secret details...</p>
      </Card>
    )
  }

  if (!secret) {
    return (
      <Card className="p-4">
        <p className="text-sm text-red-400">Secret not found</p>
        <Button variant="ghost" onClick={onClose}>Back</Button>
      </Card>
    )
  }

  const totalAssetCost = secret.assets.reduce((sum, a) => sum + (a.estimated_cost_cents ?? 0), 0)
  const readyAssets = secret.assets.filter(a => a.status === 'ready').length

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-200">{secret.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={secret.status === 'revealed' ? 'success' : secret.status === 'planning' ? 'warning' : 'info'}>
              {secret.status}
            </Badge>
            <span className="text-xs text-zinc-500">{secret.secret_type.replace(/_/g, ' ')}</span>
            <span className="text-xs text-zinc-500">{secret.visibility_scope.replace(/_/g, ' ')}</span>
          </div>
        </div>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>

      {secret.description && (
        <p className="text-sm text-zinc-400">{secret.description}</p>
      )}

      {secret.reveal_timing && (
        <div className="text-xs text-zinc-500 bg-zinc-900/50 rounded px-3 py-2">
          Reveal timing: {secret.reveal_timing}
        </div>
      )}

      {/* Participants */}
      {secret.participants.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
            Participants ({secret.participants.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {secret.participants.map(p => (
              <Badge key={p.id} variant="default">
                {p.profile_id.slice(0, 8)}...
                {p.can_edit && ' (editor)'}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Assets / Planning */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Assets ({secret.assets.length})
            {secret.assets.length > 0 && (
              <span className="ml-2 text-zinc-600">
                {readyAssets}/{secret.assets.length} ready
                {totalAssetCost > 0 && ` | ~$${(totalAssetCost / 100).toFixed(2)}`}
              </span>
            )}
          </h4>
          <Button variant="ghost" onClick={() => setShowAssetForm(!showAssetForm)}>
            {showAssetForm ? 'Cancel' : '+ Asset'}
          </Button>
        </div>

        {showAssetForm && (
          <div className="space-y-2 mb-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
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
                placeholder="Description"
                value={assetForm.description}
                onChange={e => setAssetForm(f => ({ ...f, description: e.target.value }))}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-500"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Quantity"
                value={assetForm.quantity}
                onChange={e => setAssetForm(f => ({ ...f, quantity: e.target.value }))}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-500"
              />
              <input
                type="number"
                placeholder="Est. cost (cents)"
                value={assetForm.estimated_cost_cents}
                onChange={e => setAssetForm(f => ({ ...f, estimated_cost_cents: e.target.value }))}
                className="w-32 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder-zinc-500"
              />
              <Button variant="primary" onClick={handleAddAsset} disabled={isPending}>Add</Button>
            </div>
          </div>
        )}

        {secret.assets.length > 0 && (
          <div className="space-y-1">
            {secret.assets.map(asset => (
              <div key={asset.id} className="flex items-center justify-between p-2 rounded bg-zinc-900/30 border border-zinc-800">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant={ASSET_STATUS_COLORS[asset.status]}>{asset.status}</Badge>
                  <span className="text-xs text-zinc-500">{asset.asset_type}</span>
                  <span className="text-sm text-zinc-300 truncate">{asset.description}</span>
                  {asset.quantity && <span className="text-xs text-zinc-500">({asset.quantity})</span>}
                  {asset.estimated_cost_cents > 0 && (
                    <span className="text-xs text-zinc-600">${(asset.estimated_cost_cents / 100).toFixed(2)}</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {asset.status === 'needed' && (
                    <button onClick={() => handleAssetStatusChange(asset.id, 'sourced')} className="text-xs text-blue-400 hover:text-blue-300" disabled={isPending}>Sourced</button>
                  )}
                  {asset.status === 'sourced' && (
                    <button onClick={() => handleAssetStatusChange(asset.id, 'ready')} className="text-xs text-emerald-400 hover:text-emerald-300" disabled={isPending}>Ready</button>
                  )}
                  <button onClick={() => handleDeleteAsset(asset.id)} className="text-xs text-red-400 hover:text-red-300" disabled={isPending}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discussion Thread */}
      <div>
        <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
          Planning Thread ({secret.threads.length})
        </h4>

        {secret.threads.length > 0 && (
          <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
            {secret.threads.map(t => (
              <div key={t.id} className="p-2 rounded bg-zinc-900/30 border border-zinc-800">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={t.author_type === 'chef' ? 'info' : 'default'}>{t.author_type}</Badge>
                  <span className="text-xs text-zinc-600">
                    {new Date(t.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-zinc-300">{t.message}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add to thread..."
            value={threadMsg}
            onChange={e => setThreadMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500"
          />
          <Button variant="ghost" onClick={handleSendMessage} disabled={isPending || !threadMsg.trim()}>
            Send
          </Button>
        </div>
      </div>

      {/* Execution Notes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Execution Notes</h4>
          <Button variant="ghost" onClick={() => setShowExecNotes(!showExecNotes)}>
            {showExecNotes ? 'Cancel' : 'Edit'}
          </Button>
        </div>
        {showExecNotes ? (
          <div className="space-y-2">
            <textarea
              value={executionNotes}
              onChange={e => setExecutionNotes(e.target.value)}
              rows={3}
              placeholder="How this secret should be executed during service..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500 resize-none"
            />
            <Button variant="primary" onClick={handleSaveExecutionNotes} disabled={isPending}>
              Save Notes
            </Button>
          </div>
        ) : (
          secret.execution_notes && (
            <p className="text-sm text-zinc-400 whitespace-pre-wrap">{secret.execution_notes}</p>
          )
        )}
      </div>

      {/* Cost Summary */}
      <div className="flex items-center gap-4 text-xs text-zinc-500 pt-2 border-t border-zinc-800">
        <span>Est: ${(secret.estimated_cost_cents / 100).toFixed(2)}</span>
        {secret.actual_cost_cents != null && (
          <span>Actual: ${(secret.actual_cost_cents / 100).toFixed(2)}</span>
        )}
        <span>Created: {new Date(secret.created_at).toLocaleDateString()}</span>
      </div>
    </Card>
  )
}
