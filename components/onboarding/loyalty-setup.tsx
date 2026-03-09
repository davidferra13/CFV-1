'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Star, Plus, Check, ArrowRight, AlertTriangle } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  updateLoyaltyConfig,
  createReward,
  awardBonusPoints,
  type LoyaltyConfig,
  type LoyaltyReward,
} from '@/lib/loyalty/actions'
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics/posthog'

type Client = {
  id: string
  full_name: string
  loyalty_points: number | null
  loyalty_tier: string | null
  total_events_count: number | null
}

type Props = {
  initialConfig: LoyaltyConfig | null
  initialRewards: LoyaltyReward[]
  clients: Client[]
}

type Tab = 'config' | 'rewards' | 'seed'

export function LoyaltySetup({ initialConfig, initialRewards, clients }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('config')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.ONBOARDING_HUB_PHASE_STARTED, { phase: 'loyalty' })
  }, [])

  // ─── Config state ───────────────────────────────────────────────
  const [config, setConfig] = useState({
    points_per_guest: initialConfig?.points_per_guest ?? 10,
    tier_silver_min: initialConfig?.tier_silver_min ?? 100,
    tier_gold_min: initialConfig?.tier_gold_min ?? 250,
    tier_platinum_min: initialConfig?.tier_platinum_min ?? 500,
    welcome_points: initialConfig?.welcome_points ?? 0,
  })
  const [configSaved, setConfigSaved] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  function handleSaveConfig() {
    setConfigError(null)
    if (config.tier_gold_min <= config.tier_silver_min) {
      setConfigError('Gold threshold must be higher than Silver')
      return
    }
    if (config.tier_platinum_min <= config.tier_gold_min) {
      setConfigError('Platinum threshold must be higher than Gold')
      return
    }
    startTransition(async () => {
      try {
        await updateLoyaltyConfig({
          points_per_guest: config.points_per_guest,
          tier_silver_min: config.tier_silver_min,
          tier_gold_min: config.tier_gold_min,
          tier_platinum_min: config.tier_platinum_min,
          welcome_points: config.welcome_points,
          is_active: true,
        })
        trackEvent(ANALYTICS_EVENTS.ONBOARDING_HUB_PHASE_COMPLETED, { phase: 'loyalty' })
        setConfigSaved(true)
        router.refresh()
      } catch (e) {
        setConfigError(e instanceof Error ? e.message : 'Failed to save config')
      }
    })
  }

  // ─── Reward state ────────────────────────────────────────────────
  const [rewards, setRewards] = useState<LoyaltyReward[]>(initialRewards)
  const [newReward, setNewReward] = useState({
    name: '',
    points_required: '',
    reward_type: 'free_course' as LoyaltyReward['reward_type'],
    description: '',
  })
  const [rewardError, setRewardError] = useState<string | null>(null)

  function handleAddReward() {
    if (!newReward.name.trim()) {
      setRewardError('Reward name required')
      return
    }
    const pts = parseInt(newReward.points_required, 10)
    if (!pts || pts <= 0) {
      setRewardError('Points must be a positive number')
      return
    }
    setRewardError(null)
    startTransition(async () => {
      try {
        const result = await createReward({
          name: newReward.name.trim(),
          points_required: pts,
          reward_type: newReward.reward_type,
          description: newReward.description.trim() || undefined,
        })
        setRewards((prev) => [...prev, result.reward as LoyaltyReward])
        setNewReward({ name: '', points_required: '', reward_type: 'free_course', description: '' })
        router.refresh()
      } catch (e) {
        setRewardError(e instanceof Error ? e.message : 'Failed to add reward')
      }
    })
  }

  // ─── Balance seeding state ───────────────────────────────────────
  const [balances, setBalances] = useState<Record<string, string>>({})
  const [savedClients, setSavedClients] = useState<Set<string>>(new Set())
  const [seedError, setSeedError] = useState<string | null>(null)
  const [seedingAll, setSeedingAll] = useState(false)

  function setBalance(clientId: string, value: string) {
    setBalances((prev) => ({ ...prev, [clientId]: value }))
  }

  async function seedClient(clientId: string) {
    const raw = balances[clientId]
    const pts = parseInt(raw || '0', 10)
    if (!pts || pts <= 0) return
    try {
      await awardBonusPoints(clientId, pts, 'Opening balance — migrated from previous records')
      setSavedClients((prev) => new Set(prev).add(clientId))
      router.refresh()
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : 'Failed to save balance')
    }
  }

  async function handleSeedAll() {
    setSeedError(null)
    setSeedingAll(true)
    const toSeed = clients.filter((c) => {
      const pts = parseInt(balances[c.id] || '0', 10)
      return pts > 0 && !savedClients.has(c.id)
    })
    for (const client of toSeed) {
      await seedClient(client.id)
    }
    setSeedingAll(false)
    router.refresh()
  }

  // ─── Tab UI ──────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; done: boolean }[] = [
    { key: 'config', label: '1. Program Config', done: configSaved },
    { key: 'rewards', label: '2. Reward Catalog', done: rewards.length > 0 },
    { key: 'seed', label: '3. Historical Balances', done: savedClients.size > 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex border border-stone-700 rounded-lg overflow-hidden bg-stone-900">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === tab.key
                ? 'bg-stone-900 text-white'
                : 'text-stone-400 hover:bg-stone-800'
            }`}
          >
            {tab.done && <Check className="h-3.5 w-3.5 text-green-400" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Program Config ── */}
      {activeTab === 'config' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Earn Rate &amp; Tier Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {configError && (
              <div className="rounded-md bg-red-950 border border-red-200 px-3 py-2 text-sm text-red-700">
                {configError}
              </div>
            )}
            {configSaved && (
              <div className="rounded-md bg-green-950 border border-green-200 px-3 py-2 text-sm text-green-700 flex items-center gap-2">
                <Check className="h-4 w-4" /> Config saved
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Points per Guest</Label>
                <Input
                  type="number"
                  min="1"
                  value={config.points_per_guest}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      points_per_guest: parseInt(e.target.value) || 10,
                    }))
                  }
                />
                <p className="text-xs text-stone-400">Awarded per guest served at each event</p>
              </div>
              <div className="space-y-1.5">
                <Label>Welcome Points</Label>
                <Input
                  type="number"
                  min="0"
                  value={config.welcome_points}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      welcome_points: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-xs text-stone-400">
                  One-time bonus awarded when a new client creates their portal account
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-800">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
                Lifetime Points for Tier Promotion
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Silver</Label>
                  <Input
                    type="number"
                    min="1"
                    value={config.tier_silver_min}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tier_silver_min: parseInt(e.target.value) || 100,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Gold</Label>
                  <Input
                    type="number"
                    min="1"
                    value={config.tier_gold_min}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tier_gold_min: parseInt(e.target.value) || 250,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Platinum</Label>
                  <Input
                    type="number"
                    min="1"
                    value={config.tier_platinum_min}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tier_platinum_min: parseInt(e.target.value) || 500,
                      }))
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-stone-400 mt-2">
                Bronze: 0–{config.tier_silver_min - 1} · Silver: {config.tier_silver_min}–
                {config.tier_gold_min - 1} · Gold: {config.tier_gold_min}–
                {config.tier_platinum_min - 1} · Platinum: {config.tier_platinum_min}+
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="primary" onClick={handleSaveConfig} disabled={isPending}>
                {isPending ? 'Saving…' : 'Save Config'}
              </Button>
              <Button variant="ghost" onClick={() => setActiveTab('rewards')}>
                Next: Rewards →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tab 2: Reward Catalog ── */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          {/* Existing rewards */}
          {rewards.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  Reward Catalog
                  <Badge variant="default">{rewards.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-stone-800">
                  {rewards.map((r) => (
                    <li key={r.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-stone-200">{r.name}</p>
                        {r.description && <p className="text-xs text-stone-400">{r.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="info">{r.reward_type.replace(/_/g, ' ')}</Badge>
                        <span className="text-sm font-medium text-stone-300">
                          {r.points_required} pts
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Add reward form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add a Reward</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rewardError && (
                <div className="rounded-md bg-red-950 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {rewardError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Reward Name</Label>
                  <Input
                    value={newReward.name}
                    onChange={(e) => setNewReward((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Complimentary appetizer course"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Points Required</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newReward.points_required}
                    onChange={(e) =>
                      setNewReward((prev) => ({ ...prev, points_required: e.target.value }))
                    }
                    placeholder="100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <select
                    value={newReward.reward_type}
                    onChange={(e) =>
                      setNewReward((prev) => ({
                        ...prev,
                        reward_type: e.target.value as LoyaltyReward['reward_type'],
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                  >
                    <option value="free_course">Free Course</option>
                    <option value="free_dinner">Free Dinner</option>
                    <option value="discount_fixed">Fixed Discount ($)</option>
                    <option value="discount_percent">Percent Discount (%)</option>
                    <option value="upgrade">Upgrade / Experience</option>
                  </select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Description (optional)</Label>
                  <Input
                    value={newReward.description}
                    onChange={(e) =>
                      setNewReward((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="A bonus appetizer course added to your next dinner"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="primary" onClick={handleAddReward} disabled={isPending}>
                  <Plus className="h-4 w-4 mr-1" />
                  {isPending ? 'Adding…' : 'Add Reward'}
                </Button>
                <Button variant="ghost" onClick={() => setActiveTab('seed')}>
                  Next: Seed Balances →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab 3: Historical Balances ── */}
      {activeTab === 'seed' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Seed Historical Point Balances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-amber-950 border border-amber-200 px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                The points ledger is append-only. Once saved, balances can only be corrected with an
                additional adjustment transaction — not deleted. Enter each client&apos;s historical
                balance carefully.
              </p>
            </div>

            {seedError && (
              <div className="rounded-md bg-red-950 border border-red-200 px-3 py-2 text-sm text-red-700">
                {seedError}
              </div>
            )}

            {clients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-stone-500 mb-3">No clients imported yet.</p>
                <Link href="/onboarding/clients">
                  <Button variant="secondary">Import Clients First</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  {clients.map((client) => {
                    const isSaved = savedClients.has(client.id) || (client.loyalty_points ?? 0) > 0
                    const existingPoints = client.loyalty_points ?? 0
                    return (
                      <div
                        key={client.id}
                        className={`flex items-center gap-3 rounded-md px-3 py-2.5 ${
                          isSaved ? 'bg-green-950' : 'bg-stone-800'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-200 truncate">
                            {client.full_name}
                          </p>
                          {existingPoints > 0 && (
                            <p className="text-xs text-stone-400">
                              {existingPoints} pts already saved
                            </p>
                          )}
                        </div>
                        {isSaved ? (
                          <div className="flex items-center gap-1.5 text-green-600">
                            <Check className="h-4 w-4" />
                            <span className="text-xs font-medium">Saved</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={balances[client.id] ?? ''}
                              onChange={(e) => setBalance(client.id, e.target.value)}
                              placeholder="0"
                              className="w-24 text-right"
                            />
                            <span className="text-xs text-stone-400 flex-shrink-0">pts</span>
                            <Button
                              variant="secondary"
                              onClick={() => startTransition(() => seedClient(client.id))}
                              disabled={
                                isPending ||
                                !balances[client.id] ||
                                parseInt(balances[client.id], 10) <= 0
                              }
                            >
                              Save
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {clients.some((c) => !savedClients.has(c.id) && (c.loyalty_points ?? 0) === 0) && (
                  <Button
                    variant="primary"
                    onClick={() => startTransition(handleSeedAll)}
                    disabled={isPending || seedingAll}
                    className="w-full"
                  >
                    {seedingAll ? 'Saving all balances…' : 'Save All Balances'}
                  </Button>
                )}
              </>
            )}

            <div className="pt-4 border-t border-stone-800 flex gap-3">
              <Link href="/onboarding/recipes" className="flex-1">
                <Button variant="primary" className="w-full">
                  Continue to Recipes
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/onboarding">
                <Button variant="ghost">Back to Overview</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
