'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Plus, Trophy, Clock, FlaskConical } from 'lucide-react'
import { createABTest, resolveABTest } from '@/lib/marketing/ab-test-actions'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string
  name: string
}

interface AbTest {
  id: string
  campaignId: string
  variantASubject: string
  variantBSubject: string
  testPercent: number
  winner?: 'a' | 'b' | null
  resolvedAt?: string | null
}

interface AbTestConfigProps {
  campaigns: Campaign[]
  tests: AbTest[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AbTestConfig({ campaigns, tests: initialTests }: AbTestConfigProps) {
  const [tests, setTests] = useState<AbTest[]>(initialTests)
  const [isPending, startTransition] = useTransition()
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Create form state
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaigns[0]?.id || '')
  const [variantA, setVariantA] = useState('')
  const [variantB, setVariantB] = useState('')
  const [testPercent, setTestPercent] = useState(20)

  function handleCreate() {
    if (!variantA.trim() || !variantB.trim()) {
      toast.error('Both subject line variants are required')
      return
    }
    if (!selectedCampaignId) {
      toast.error('Select a campaign')
      return
    }

    startTransition(async () => {
      try {
        const result = await createABTest({
          campaignId: selectedCampaignId,
          variantASubject: variantA.trim(),
          variantBSubject: variantB.trim(),
          testPercent,
        })
        if (result.test) {
          setTests((prev) => [...prev, result.test])
        }
        setVariantA('')
        setVariantB('')
        setTestPercent(20)
        setShowCreateForm(false)
        toast.success('A/B test created')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create test'
        toast.error(message)
      }
    })
  }

  function handleResolve(testId: string, winner: 'a' | 'b') {
    startTransition(async () => {
      try {
        await resolveABTest(testId, winner)
        setTests((prev) =>
          prev.map((t) =>
            t.id === testId ? { ...t, winner, resolvedAt: new Date().toISOString() } : t
          )
        )
        toast.success(`Variant ${winner} selected as winner`)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to resolve test'
        toast.error(message)
      }
    })
  }

  function getCampaignName(campaignId: string): string {
    return campaigns.find((c) => c.id === campaignId)?.name || 'Unknown Campaign'
  }

  const activeTests = tests.filter((t) => !t.resolvedAt)
  const resolvedTests = tests.filter((t) => t.resolvedAt)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>A/B Tests</CardTitle>
        <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-1" />
          New Test
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create Form */}
        {showCreateForm && (
          <div className="rounded-lg border border-brand-700 bg-brand-950/30 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-stone-100">Create A/B Test</h4>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">Campaign</label>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Variant A Subject"
                value={variantA}
                onChange={(e) => setVariantA(e.target.value)}
                placeholder="e.g., Your Private Chef Awaits"
                required
              />
              <Input
                label="Variant B Subject"
                value={variantB}
                onChange={(e) => setVariantB(e.target.value)}
                placeholder="e.g., Exclusive Dining Experience"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1.5">
                Test Percentage: {testPercent}%
              </label>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={testPercent}
                onChange={(e) => setTestPercent(Number(e.target.value))}
                className="w-full accent-brand-600"
              />
              <p className="text-xs text-stone-500 mt-1">
                {testPercent}% of recipients will receive each variant. The remaining{' '}
                {100 - testPercent * 2}% will receive the winner.
              </p>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} loading={isPending}>
                Create Test
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Active Tests */}
        {activeTests.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-stone-300 mb-3 flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Active Tests
            </h4>
            <div className="space-y-3">
              {activeTests.map((test) => (
                <div key={test.id} className="rounded-lg border border-stone-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-stone-100">
                      {getCampaignName(test.campaignId)}
                    </p>
                    <Badge variant="warning">
                      <Clock className="h-3 w-3 mr-1" />
                      Running ({test.testPercent}%)
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="rounded-lg bg-stone-800 p-3">
                      <p className="text-xs font-medium text-stone-500 mb-1">Variant A</p>
                      <p className="text-sm text-stone-100">{test.variantASubject}</p>
                    </div>
                    <div className="rounded-lg bg-stone-800 p-3">
                      <p className="text-xs font-medium text-stone-500 mb-1">Variant B</p>
                      <p className="text-sm text-stone-100">{test.variantBSubject}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleResolve(test.id, 'a')}
                      loading={isPending}
                    >
                      <Trophy className="h-3 w-3 mr-1" />
                      Pick A
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleResolve(test.id, 'b')}
                      loading={isPending}
                    >
                      <Trophy className="h-3 w-3 mr-1" />
                      Pick B
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolved Tests */}
        {resolvedTests.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-stone-300 mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Resolved Tests
            </h4>
            <div className="space-y-2">
              {resolvedTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center gap-3 rounded-lg border border-stone-700 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-100">
                      {getCampaignName(test.campaignId)}
                    </p>
                    <p className="text-xs text-stone-500">
                      Winner: {test.winner === 'a' ? test.variantASubject : test.variantBSubject}
                    </p>
                  </div>
                  <Badge variant="success">Variant {test.winner}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {tests.length === 0 && !showCreateForm && (
          <p className="text-sm text-stone-400 italic text-center py-8">
            No A/B tests yet. Create one to optimize your email subject lines.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
