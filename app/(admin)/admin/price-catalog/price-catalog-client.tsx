'use client'

import { useState, useEffect, useTransition, Suspense } from 'react'
import {
  getOpenClawStats,
  getOpenClawPrices,
  getOpenClawSources,
  getOpenClawChanges,
  syncPricesToChefFlow,
  type OpenClawPrice,
  type OpenClawStats,
  type SyncResult,
} from '@/lib/openclaw/sync'
import { CatalogTab } from './catalog-tab'
import { VendorImportTab } from './vendor-import-tab'

type Tab = 'overview' | 'prices' | 'sources' | 'changes' | 'sync' | 'catalog' | 'vendor-import'

export function PriceCatalogClient() {
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<OpenClawStats | null>(null)
  const [prices, setPrices] = useState<OpenClawPrice[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [changes, setChanges] = useState<any[]>([])
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tierFilter, setTierFilter] = useState('retail')
  const [searchFilter, setSearchFilter] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    loadData()
  }, [tab])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      if (tab === 'overview' || tab === 'sync') {
        const s = await getOpenClawStats()
        setStats(s)
        if (!s) setError('Could not reach OpenClaw Pi. Is it online?')
      }
      if (tab === 'prices') {
        const p = await getOpenClawPrices({
          tier: tierFilter,
          ingredient: searchFilter || undefined,
          limit: 500,
        })
        setPrices(p)
      }
      if (tab === 'sources') {
        const s = await getOpenClawSources()
        setSources(s)
      }
      if (tab === 'changes') {
        const c = await getOpenClawChanges(100)
        setChanges(c)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function handleSync(dryRun: boolean) {
    startTransition(async () => {
      try {
        setSyncResult(null)
        const result = await syncPricesToChefFlow({ tier: tierFilter, dryRun })
        setSyncResult(result)
      } catch (err) {
        setSyncResult({
          success: false,
          error: err instanceof Error ? err.message : 'Sync failed',
          matched: 0,
          updated: 0,
          skipped: 0,
          notFound: 0,
        })
      }
    })
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'prices', label: 'Prices' },
    { key: 'sources', label: 'Sources' },
    { key: 'changes', label: 'Changes' },
    { key: 'sync', label: 'Sync to ChefFlow' },
    { key: 'catalog', label: 'Catalog' },
    { key: 'vendor-import', label: 'Vendor Import' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Price Catalog</h1>
      <p className="text-sm text-muted-foreground mb-6">
        OpenClaw Price Intelligence from the Raspberry Pi. View scraped prices, manage sources, and
        sync to ChefFlow.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div>
          {loading ? (
            <div className="text-muted-foreground">Connecting to Pi...</div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Sources" value={stats.sources} />
              <StatCard label="Ingredients" value={stats.canonicalIngredients} />
              <StatCard label="Current Prices" value={stats.currentPrices} />
              <StatCard label="Price Changes" value={stats.priceChanges} />
              <div className="col-span-2 md:col-span-4 bg-card border rounded-lg p-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  Last scrape:{' '}
                  {stats.lastScrapeAt ? new Date(stats.lastScrapeAt).toLocaleString() : 'Never'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Pi status: <span className="text-green-500 font-medium">Online</span> (checked{' '}
                  {new Date(stats.timestamp).toLocaleTimeString()})
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 rounded-lg p-4">
              Cannot reach OpenClaw Pi at {process.env.OPENCLAW_API_URL || '10.0.0.177:8081'}. Check
              that the Pi is on and sync-api is running.
            </div>
          )}
        </div>
      )}

      {/* Prices Tab */}
      {tab === 'prices' && (
        <div>
          <div className="flex gap-3 mb-4">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm bg-background"
            >
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="farm_direct">Farm Direct</option>
            </select>
            <input
              type="text"
              placeholder="Search ingredient..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm bg-background flex-1 max-w-xs"
            />
            <button
              onClick={loadData}
              className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Search
            </button>
          </div>

          {loading ? (
            <div className="text-muted-foreground">Loading prices...</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Ingredient</th>
                    <th className="text-left px-3 py-2 font-medium">Price</th>
                    <th className="text-left px-3 py-2 font-medium">Source</th>
                    <th className="text-left px-3 py-2 font-medium">Confidence</th>
                    <th className="text-left px-3 py-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {prices.map((p, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <span className="font-medium">
                          {p.ingredient_name || p.canonical_ingredient_id}
                        </span>
                        {p.category && (
                          <span className="text-xs text-muted-foreground ml-2">{p.category}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono">
                        ${(p.price_cents / 100).toFixed(2)}/{p.price_unit}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.source_name || p.source_id}
                      </td>
                      <td className="px-3 py-2">
                        <ConfidenceBadge confidence={p.confidence} />
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {p.last_confirmed_at
                          ? new Date(p.last_confirmed_at).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                  {prices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                        No prices found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground">
                {prices.length} price{prices.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sources Tab */}
      {tab === 'sources' && (
        <div>
          {loading ? (
            <div className="text-muted-foreground">Loading sources...</div>
          ) : (
            <div className="grid gap-3">
              {sources.map((s, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{s.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {s.source_id} | {s.type} | {s.state}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          s.status === 'active'
                            ? 'bg-green-500/10 text-green-600'
                            : s.status === 'stale'
                              ? 'bg-yellow-500/10 text-yellow-600'
                              : 'bg-red-500/10 text-red-600'
                        }`}
                      >
                        {s.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {s.last_scraped_at
                          ? `Last: ${new Date(s.last_scraped_at).toLocaleString()}`
                          : 'Never scraped'}
                      </p>
                    </div>
                  </div>
                  {s.notes && <p className="text-xs text-muted-foreground mt-2">{s.notes}</p>}
                </div>
              ))}
              {sources.length === 0 && (
                <div className="text-center text-muted-foreground py-8">No sources found</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Changes Tab */}
      {tab === 'changes' && (
        <div>
          {loading ? (
            <div className="text-muted-foreground">Loading changes...</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Ingredient</th>
                    <th className="text-left px-3 py-2 font-medium">Old Price</th>
                    <th className="text-left px-3 py-2 font-medium">New Price</th>
                    <th className="text-left px-3 py-2 font-medium">Change</th>
                    <th className="text-left px-3 py-2 font-medium">Source</th>
                    <th className="text-left px-3 py-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {changes.map((c, i) => {
                    const changePct =
                      c.old_price_cents && c.old_price_cents > 0
                        ? (
                            ((c.new_price_cents - c.old_price_cents) / c.old_price_cents) *
                            100
                          ).toFixed(1)
                        : null
                    return (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">
                          {c.ingredient_name || c.canonical_ingredient_id}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">
                          {c.old_price_cents ? `$${(c.old_price_cents / 100).toFixed(2)}` : 'New'}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          ${(c.new_price_cents / 100).toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          {changePct && (
                            <span
                              className={
                                parseFloat(changePct) > 0 ? 'text-red-500' : 'text-green-500'
                              }
                            >
                              {parseFloat(changePct) > 0 ? '+' : ''}
                              {changePct}%
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {c.source_name || c.source_id}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {c.observed_at ? new Date(c.observed_at).toLocaleString() : '-'}
                        </td>
                      </tr>
                    )
                  })}
                  {changes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                        No price changes recorded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sync Tab */}
      {tab === 'sync' && (
        <div>
          <div className="border rounded-lg p-6 mb-4">
            <h2 className="text-lg font-semibold mb-2">Sync Prices to ChefFlow</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Match OpenClaw ingredient prices to your ChefFlow ingredients and update{' '}
              <code>last_price_cents</code>. This triggers automatic recipe and menu cost
              recalculation.
            </p>

            <div className="flex gap-3 mb-4">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm bg-background"
              >
                <option value="retail">Retail Prices</option>
                <option value="wholesale">Wholesale Prices</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleSync(true)}
                disabled={isPending}
                className="px-4 py-2 text-sm border rounded hover:bg-muted disabled:opacity-50"
              >
                {isPending ? 'Running...' : 'Dry Run (Preview)'}
              </button>
              <button
                onClick={() => handleSync(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>

          {syncResult && (
            <div
              className={`border rounded-lg p-4 ${syncResult.success ? 'bg-green-500/5 border-green-500/20' : 'bg-destructive/5 border-destructive/20'}`}
            >
              <h3 className="font-medium mb-2">
                {syncResult.success ? 'Sync Complete' : 'Sync Failed'}
              </h3>
              {syncResult.error && (
                <p className="text-destructive text-sm mb-2">{syncResult.error}</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Matched:</span>{' '}
                  <span className="font-medium">{syncResult.matched}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span>{' '}
                  <span className="font-medium text-green-600">{syncResult.updated}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Unchanged:</span>{' '}
                  <span className="font-medium">{syncResult.skipped}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Not in ChefFlow:</span>{' '}
                  <span className="font-medium text-muted-foreground">{syncResult.notFound}</span>
                </div>
              </div>
            </div>
          )}

          {stats && (
            <div className="mt-4 text-sm text-muted-foreground">
              <p>
                Pi has {stats.currentPrices} prices across {stats.sources} sources.
              </p>
              <p>
                Last scrape:{' '}
                {stats.lastScrapeAt ? new Date(stats.lastScrapeAt).toLocaleString() : 'Never'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Catalog Tab */}
      {tab === 'catalog' && (
        <Suspense fallback={<div className="animate-pulse h-96 bg-stone-900 rounded-lg" />}>
          <CatalogTab />
        </Suspense>
      )}

      {/* Vendor Import Tab */}
      {tab === 'vendor-import' && <VendorImportTab />}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    exact_receipt: 'bg-green-500/10 text-green-600',
    direct_scrape: 'bg-blue-500/10 text-blue-600',
    instacart_adjusted: 'bg-yellow-500/10 text-yellow-600',
    flyer_scrape: 'bg-purple-500/10 text-purple-600',
    government_baseline: 'bg-gray-500/10 text-gray-600',
  }
  const labels: Record<string, string> = {
    exact_receipt: 'Receipt',
    direct_scrape: 'Direct',
    instacart_adjusted: 'Instacart',
    flyer_scrape: 'Flyer',
    government_baseline: 'Gov Baseline',
  }
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded ${colors[confidence] || 'bg-muted text-muted-foreground'}`}
    >
      {labels[confidence] || confidence}
    </span>
  )
}
