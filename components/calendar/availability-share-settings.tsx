'use client'

import { useState, useTransition } from 'react'
import { generateShareToken, revokeShareToken } from '@/lib/scheduling/availability-share-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Token = {
  id: string
  token: string
  label?: string | null
  is_active: boolean | null
  expires_at: string | null
  created_at: string | null
  tenant_id?: string
}

export function AvailabilityShareSettings({ tokens }: { tokens: Token[] }) {
  const [isPending, startTransition] = useTransition()
  const [label, setLabel] = useState('')

  const activeTokens = tokens.filter((t) => t.is_active)

  function handleGenerate() {
    startTransition(async () => {
      await generateShareToken(label || undefined)
      setLabel('')
    })
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      await revokeShareToken(id)
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate Share Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-500">
            Create a public link that shows your availability without revealing event details or
            client names.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (e.g., Website embed)"
              className="flex-1 border border-stone-600 rounded px-3 py-2 text-sm"
            />
            <Button onClick={handleGenerate} disabled={isPending}>
              {isPending ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeTokens.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-stone-300">Active Links</h3>
          {activeTokens.map((token) => {
            const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/availability/${token.token}`
            return (
              <Card key={token.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-stone-100 truncate">
                          {token.label || 'Untitled'}
                        </p>
                        <Badge variant="success">Active</Badge>
                      </div>
                      <p className="text-xs text-stone-400 truncate mt-0.5">{url}</p>
                      <p className="text-xs text-stone-400">
                        Created {new Date(token.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(url)}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleRevoke(token.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
