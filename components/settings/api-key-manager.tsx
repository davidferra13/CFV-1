'use client'
import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Plus, Trash2, Shield, ShieldCheck } from '@/components/ui/icons'
import { toast } from 'sonner'
import { createApiKey, revokeApiKey } from '@/lib/api/key-actions'
import { useConfirm } from '@/lib/hooks/use-confirm'
import {
  API_SCOPES,
  LEGACY_DEFAULT_SCOPES,
  getScopesByCategory,
  type ApiScope,
} from '@/lib/api/v2/scopes'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  last_used_at?: string
  is_active: boolean
  created_at: string
}

const SCOPE_CATEGORIES = getScopesByCategory()

/** Group label for display (e.g. "Read Access", "Write Access", "Admin") */
function categoryLabel(cat: string): string {
  // Check if all scopes in this category are :read, :write, or :manage
  const scopes = SCOPE_CATEGORIES[cat]
  if (!scopes) return cat
  const suffixes = scopes.map((s) => s.scope.split(':')[1])
  if (suffixes.every((s) => s === 'read')) return `${cat} (Read)`
  if (suffixes.every((s) => s === 'write')) return `${cat} (Write)`
  if (suffixes.every((s) => s === 'manage')) return `${cat} (Admin)`
  return cat
}

function ScopeSelector({
  selected,
  onChange,
}: {
  selected: ApiScope[]
  onChange: (scopes: ApiScope[]) => void
}) {
  function toggle(scope: ApiScope) {
    if (selected.includes(scope)) {
      onChange(selected.filter((s) => s !== scope))
    } else {
      onChange([...selected, scope])
    }
  }

  function selectAll() {
    onChange(Object.keys(API_SCOPES) as ApiScope[])
  }

  function selectNone() {
    onChange([])
  }

  function selectReadOnly() {
    onChange((Object.keys(API_SCOPES) as ApiScope[]).filter((s) => s.endsWith(':read')))
  }

  // Group scopes by access type (read, write, admin) for cleaner display
  const readScopes: { scope: ApiScope; label: string }[] = []
  const writeScopes: { scope: ApiScope; label: string }[] = []
  const adminScopes: { scope: ApiScope; label: string }[] = []

  for (const [scope, label] of Object.entries(API_SCOPES)) {
    const s = scope as ApiScope
    if (scope.endsWith(':read')) readScopes.push({ scope: s, label })
    else if (scope.endsWith(':write')) writeScopes.push({ scope: s, label })
    else adminScopes.push({ scope: s, label })
  }

  const groups = [
    { title: 'Read Access', scopes: readScopes },
    { title: 'Write Access', scopes: writeScopes },
    { title: 'Admin', scopes: adminScopes },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-stone-300">Scopes *</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectReadOnly}
            className="text-xs text-brand-400 hover:text-brand-300"
          >
            Read only
          </button>
          <span className="text-stone-600">|</span>
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-brand-400 hover:text-brand-300"
          >
            All
          </button>
          <span className="text-stone-600">|</span>
          <button
            type="button"
            onClick={selectNone}
            className="text-xs text-brand-400 hover:text-brand-300"
          >
            None
          </button>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.title}>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
            {group.title}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {group.scopes.map(({ scope, label }) => (
              <label
                key={scope}
                className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-stone-800/50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(scope)}
                  onChange={() => toggle(scope)}
                  className="mt-0.5 rounded border-stone-600 text-brand-500 focus:ring-brand-500 focus:ring-offset-0"
                />
                <div className="min-w-0">
                  <span className="text-sm text-stone-200 font-mono">{scope}</span>
                  <p className="text-xs text-stone-500">{label}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Display compact scope badges for an existing key */
function ScopeBadges({ scopes }: { scopes: string[] }) {
  if (!scopes || scopes.length === 0) {
    return <span className="text-xs text-stone-500">No scopes</span>
  }
  // Show up to 3 scopes, then "+N more"
  const visible = scopes.slice(0, 3)
  const remaining = scopes.length - visible.length
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {visible.map((s) => (
        <span
          key={s}
          className="inline-flex items-center rounded bg-stone-800 px-1.5 py-0.5 text-[10px] font-mono text-stone-400"
        >
          {s}
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-500">
          +{remaining} more
        </span>
      )}
    </div>
  )
}

export function ApiKeyManager({ apiKeys }: { apiKeys: ApiKey[] }) {
  const [showForm, setShowForm] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<ApiScope[]>([...LEGACY_DEFAULT_SCOPES])
  const [newKey, setNewKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { confirm, ConfirmDialog } = useConfirm()
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  function handleCreate() {
    if (!keyName.trim()) return toast.error('Name is required')
    if (selectedScopes.length === 0) return toast.error('Select at least one scope')
    startTransition(async () => {
      try {
        const result = await createApiKey(keyName, selectedScopes)
        setNewKey(result.key)
        toast.success('API key created')
        setKeyName('')
        setSelectedScopes([...LEGACY_DEFAULT_SCOPES])
        setShowForm(false)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  async function handleRevoke(id: string) {
    const ok = await confirm({
      title: 'Revoke this API key?',
      description:
        'Any integration using this key will stop working immediately. This cannot be undone.',
      confirmLabel: 'Revoke Key',
      variant: 'danger',
    })
    if (!ok) return
    startTransition(async () => {
      try {
        await revokeApiKey(id)
        toast.success('Key revoked')
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog />
      {newKey && (
        <Card className="border-green-300 bg-green-950">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-green-800 mb-2">
              Your new API key (copy it now - it won&apos;t be shown again):
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-stone-900 border border-green-300 rounded px-3 py-2 text-sm font-mono">
                {newKey}
              </code>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(newKey)
                  toast.success('Copied!')
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => setNewKey(null)}>
              I&apos;ve saved this key
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-stone-400">
          {apiKeys.length} key{apiKeys.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          Create Key
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Key Name *</label>
              <input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., Zapier Integration"
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
            <ScopeSelector selected={selectedScopes} onChange={setSelectedScopes} />
            <div className="flex gap-2">
              <Button onClick={handleCreate} loading={isPending}>
                Generate Key
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {apiKeys.map((key) => (
        <Card key={key.id}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-stone-100">{key.name}</p>
                <code className="text-xs text-stone-500 font-mono">
                  {key.key_prefix}&bull;&bull;&bull;
                </code>
                {key.last_used_at && (
                  <p className="text-xs text-stone-400 mt-1">
                    Last used: {new Date(key.last_used_at).toLocaleDateString()}
                  </p>
                )}
                <ScopeBadges scopes={key.scopes} />
              </div>
              <div className="flex items-center gap-2">
                {key.scopes?.length > 3 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedKey(expandedKey === key.id ? null : key.id)}
                  >
                    <Shield className="h-4 w-4" />
                  </Button>
                )}
                <Badge variant={key.is_active ? 'success' : 'error'}>
                  {key.is_active ? 'Active' : 'Revoked'}
                </Badge>
                {key.is_active && (
                  <Button size="sm" variant="danger" onClick={() => handleRevoke(key.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {expandedKey === key.id && (
              <div className="mt-3 pt-3 border-t border-stone-800">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  All Scopes
                </p>
                <div className="flex flex-wrap gap-1">
                  {key.scopes.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center rounded bg-stone-800 px-1.5 py-0.5 text-[10px] font-mono text-stone-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
