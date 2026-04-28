// Admin Feature Flags - Per-chef feature flag management

import { requireAdmin } from '@/lib/auth/admin'
import { getAllChefFlags } from '@/lib/admin/platform-stats'
import { FlagTogglePanel } from '@/components/admin/flag-toggle-panel'
import { redirect } from 'next/navigation'
import { ToggleLeft } from '@/components/ui/icons'

// All known feature flags - add new flags here as features are built
const KNOWN_FLAGS = [
  {
    key: 'ai_pricing_suggestions',
    label: 'Pricing Suggestions',
    description: 'Show the pricing panel on event/quote pages',
  },
  {
    key: 'ai_menu_recommendations',
    label: 'Menu Recommendations',
    description: 'Show menu hint cards during event creation',
  },
  {
    key: 'social_platform',
    label: 'Social Platform',
    description: 'Enable social features (network, feed, connected accounts)',
  },
  {
    key: 'advanced_analytics',
    label: 'Advanced Analytics',
    description: 'Show the full 9-tab Analytics Hub',
  },
  {
    key: 'beta_features',
    label: 'Beta Features',
    description: 'Catch-all flag for unreleased or experimental features',
  },
  {
    key: 'developer_tools',
    label: 'Developer Tools',
    description:
      'Exception-only: enable advanced API keys and webhook tooling for approved custom integrations',
  },
  {
    key: 'unreliable_availability_warnings',
    label: 'Availability Warnings',
    description:
      'Show marketplace availability blocking reminders on the chef availability broadcaster',
  },
  {
    key: 'allergen_matrix',
    label: 'Allergen Matrix',
    description:
      'Expose allergen matrix education and controls for chefs using menu safety workflows',
  },
  {
    key: 'supplier_calling',
    label: 'Supplier Calling',
    description:
      'AI phone calling: places automated calls to vendor suppliers to check ingredient availability. Requires Twilio. Gated - off by default for all chefs.',
  },
] as const

export default async function AdminFlagsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  let chefs: { id: string; business_name: string | null }[] = []
  let flagsByChef: Record<string, Record<string, boolean>> = {}
  let note: string | null = null

  try {
    const result = await getAllChefFlags()
    chefs = result.chefs
    flagsByChef = result.flagsByChef
  } catch {
    note =
      'chef_feature_flags table not yet created. Apply the admin migrations to enable this feature.'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-violet-950 rounded-lg">
          <ToggleLeft size={18} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-100">Feature Flags</h1>
          <p className="text-sm text-stone-500">Control which features are enabled per chef</p>
        </div>
      </div>

      {note && (
        <div className="bg-amber-950 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      {/* Flag Legend */}
      <div className="bg-stone-900 rounded-xl border border-stone-700 p-4">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
          Flag Reference
        </h2>
        <div className="space-y-2">
          {KNOWN_FLAGS.map((flag) => (
            <div key={flag.key} className="flex items-start gap-3">
              <span className="font-mono text-xs bg-stone-800 px-1.5 py-0.5 rounded text-stone-400 shrink-0 mt-0.5">
                {flag.key}
              </span>
              <div>
                <span className="text-sm font-medium text-stone-300">{flag.label}</span>
                <p className="text-xs text-slate-400">{flag.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-950/40 rounded-xl border border-amber-900/70 p-4 space-y-3">
        <div>
          <h2 className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
            Developer Tools Policy
          </h2>
          <p className="mt-2 text-sm text-amber-100">
            Keep <span className="font-mono">developer_tools</span> off by default. Only enable it
            for a specific chef account that has an approved custom integration need, a named owner,
            and a review date.
          </p>
        </div>
        <ul className="space-y-1 text-xs text-amber-200/90">
          <li>Default state: off for all chefs.</li>
          <li>Approval bar: explicit business need, owner, and sunset condition.</li>
          <li>
            Review cadence: quarterly. Run{' '}
            <span className="font-mono">npm run audit:developer-tools</span> before renewals.
          </li>
          <li>
            Reference: <span className="font-mono">docs/developer-tools-runbook.md</span>
          </li>
        </ul>
      </div>

      {!note && (
        <FlagTogglePanel chefs={chefs} flagsByChef={flagsByChef} knownFlags={KNOWN_FLAGS} />
      )}
    </div>
  )
}
