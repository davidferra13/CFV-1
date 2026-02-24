'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { addComp, redeemComp } from '@/lib/guests/comp-actions'

interface Comp {
  id: string
  description: string
  created_at: string
  redeemed_at: string | null
  redeemed_by: string | null
}

interface GuestCompPanelProps {
  guestId: string
  comps: Comp[]
}

export function GuestCompPanel({ guestId, comps }: GuestCompPanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newDescription, setNewDescription] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const activeComps = comps.filter((c) => !c.redeemed_at)
  const redeemedComps = comps.filter((c) => c.redeemed_at)

  const handleAddComp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDescription.trim()) return
    setLoading(true)
    setError(null)
    try {
      await addComp({
        guest_id: guestId,
        description: newDescription.trim(),
      })
      setNewDescription('')
      setShowAddForm(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to add comp')
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = async (compId: string) => {
    setLoading(true)
    setError(null)
    try {
      await redeemComp(compId)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to redeem comp')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Comps</CardTitle>
        <Button variant="secondary" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : 'Add Comp'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Add comp form */}
        {showAddForm && (
          <form onSubmit={handleAddComp} className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g. Free dessert, Complimentary bottle"
                required
              />
            </div>
            <Button type="submit" size="sm" loading={loading}>
              Save
            </Button>
          </form>
        )}

        {/* Active comps */}
        {activeComps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">
              Active ({activeComps.length})
            </h4>
            {activeComps.map((comp) => (
              <div
                key={comp.id}
                className="flex items-center justify-between rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-stone-200">{comp.description}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Added {new Date(comp.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleRedeem(comp.id)}
                  loading={loading}
                >
                  Redeem
                </Button>
              </div>
            ))}
          </div>
        )}

        {activeComps.length === 0 && !showAddForm && (
          <p className="text-sm text-stone-500">No active comps.</p>
        )}

        {/* Redeemed comps */}
        {redeemedComps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">
              Redeemed ({redeemedComps.length})
            </h4>
            {redeemedComps.map((comp) => (
              <div
                key={comp.id}
                className="flex items-center justify-between rounded-lg border border-stone-800 px-4 py-3 opacity-60"
              >
                <div>
                  <p className="text-sm text-stone-400 line-through">{comp.description}</p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Redeemed{' '}
                    {comp.redeemed_at ? new Date(comp.redeemed_at).toLocaleDateString() : ''}
                    {comp.redeemed_by && ` by ${comp.redeemed_by}`}
                  </p>
                </div>
                <Badge variant="default">Redeemed</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
