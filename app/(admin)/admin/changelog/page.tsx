// Admin Changelog / Release Notes - Platform version history and recent deployments

import { requireAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import { FileText } from '@/components/ui/icons'

// Static changelog entries (no DB table needed - maintained in code)
const RELEASES = [
  {
    version: '1.12.0',
    date: '2026-03-08',
    title: 'Admin Super View Complete',
    changes: [
      'Added 11 new admin data pages (subscriptions, chef health, lifecycle, errors, SLA, jobs, data tools, sessions, changelog, benchmarks)',
      'Client impersonation with purple banner',
      'CSV export on all admin data pages',
      'Notification delivery audit page',
    ],
  },
  {
    version: '1.11.0',
    date: '2026-03-06',
    title: 'Infrastructure Migration & Remy Fixes',
    changes: [
      'Migrated beta server from Raspberry Pi to PC',
      'Fixed Remy classifier routing (noun-led queries)',
      'Added 12 COMMAND_PATTERNS to deterministic classifier',
      'Switched intent parser + streaming to fast model (qwen3:4b)',
      'Added ThinkingBlockFilter for clean streaming',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-03-03',
    title: 'GOLDMINE Phase 3 & Risk Gap Closure',
    changes: [
      'GOLDMINE email intelligence (deterministic extraction + scoring)',
      'Consolidated 3 lead scoring systems into one',
      'Loyalty hardwired into invoices, emails, Remy, event detail, client profile',
      '14 gap closures completed',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-02-27',
    title: 'Privacy Architecture & Ollama Boundary',
    changes: [
      'Level 3 privacy: conversations in browser IndexedDB only',
      'Gemini/Ollama boundary finalized and audited',
      'Ollama loop bug fixed (fail-fast + max 2 retries)',
      'Zero Hallucination audit framework established',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-02-22',
    title: 'Admin Super View Phase 1-6',
    changes: [
      'View as Chef impersonation mode',
      '14 cross-tenant admin data pages',
      'Platform-wide search across 5 entity types',
      'Chef onboarding completeness tracker',
      'Remy activity + Gmail sync monitoring',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-02-15',
    title: 'Foundation Schema & Freemium',
    changes: [
      '4-layer database schema (foundation, inquiry/messaging, events/quotes/financials, menus/recipes/costing)',
      'Freemium tier system with Pro feature gating',
      '8-state event FSM',
      'Ledger-first financial model',
    ],
  },
]

export default async function AdminChangelogPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-stone-800 rounded-lg">
          <FileText size={18} className="text-stone-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Changelog</h1>
          <p className="text-sm text-stone-500">
            {RELEASES.length} release{RELEASES.length !== 1 ? 's' : ''} · Latest: v
            {RELEASES[0].version}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {RELEASES.map((release, i) => (
          <div
            key={release.version}
            className={`bg-stone-900 rounded-xl border ${i === 0 ? 'border-green-800' : 'border-slate-200'} p-5`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${i === 0 ? 'bg-green-900 text-green-400' : 'bg-stone-800 text-stone-400'}`}
              >
                v{release.version}
              </span>
              <span className="text-xs text-stone-500">
                {new Date(release.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              {i === 0 && <span className="text-xs text-green-400 font-medium">Latest</span>}
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">{release.title}</h3>
            <ul className="space-y-1">
              {release.changes.map((change, j) => (
                <li key={j} className="text-xs text-stone-400 flex items-start gap-2">
                  <span className="text-stone-600 mt-0.5">-</span>
                  {change}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
