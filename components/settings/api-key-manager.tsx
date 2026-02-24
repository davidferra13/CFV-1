'use client'
import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createApiKey, revokeApiKey } from '@/lib/api/key-actions'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  last_used_at?: string
  is_active: boolean
  created_at: string
}

export function ApiKeyManager({ apiKeys }: { apiKeys: ApiKey[] }) {
  const [showForm, setShowForm] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate() {
    if (!keyName.trim()) return toast.error('Name is required')
    startTransition(async () => {
      try {
        const result = await createApiKey(keyName)
        setNewKey(result.key)
        toast.success('API key created')
        setKeyName('')
        setShowForm(false)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  function handleRevoke(id: string) {
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
      {newKey && (
        <Card className="border-green-300 bg-green-950">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-green-800 mb-2">
              Your new API key (copy it now — it won&apos;t be shown again):
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-surface border border-green-300 rounded px-3 py-2 text-sm font-mono">
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
          <CardContent className="py-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Key Name *</label>
              <input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., Zapier Integration"
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
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
          <CardContent className="flex items-center justify-between py-4">
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
            </div>
            <div className="flex gap-2">
              <Badge variant={key.is_active ? 'success' : 'error'}>
                {key.is_active ? 'Active' : 'Revoked'}
              </Badge>
              {key.is_active && (
                <Button size="sm" variant="danger" onClick={() => handleRevoke(key.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
