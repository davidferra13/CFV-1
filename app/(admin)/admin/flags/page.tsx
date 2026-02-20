// Admin Feature Flags — Per-chef feature flag management

import { requireAdmin } from '@/lib/auth/admin'
import { getAllChefFlags } from '@/lib/admin/platform-stats'
import { redirect } from 'next/navigation'
import { ToggleLeft } from 'lucide-react'

// All known feature flags — add new flags here as features are built
const KNOWN_FLAGS = [
  { key: 'ai_pricing_suggestions', label: 'AI Pricing Suggestions', description: 'Show the AI pricing panel on event/quote pages' },
  { key: 'ai_menu_recommendations', label: 'AI Menu Recommendations', description: 'Show AI menu hint cards during event creation' },
  { key: 'social_platform', label: 'Social Platform', description: 'Enable social features (network, feed, connected accounts)' },
  { key: 'advanced_analytics', label: 'Advanced Analytics', description: 'Show the full 9-tab Analytics Hub' },
  { key: 'beta_features', label: 'Beta Features', description: 'Catch-all flag for unreleased or experimental features' },
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
    note = 'chef_feature_flags table not yet created. Apply the admin migrations to enable this feature.'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-violet-50 rounded-lg">
          <ToggleLeft size={18} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Feature Flags</h1>
          <p className="text-sm text-slate-500">Control which features are enabled per chef</p>
        </div>
      </div>

      {note && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      {/* Flag Legend */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Known Flags</h2>
        <div className="space-y-2">
          {KNOWN_FLAGS.map((flag) => (
            <div key={flag.key} className="flex items-start gap-3">
              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 shrink-0 mt-0.5">
                {flag.key}
              </span>
              <div>
                <span className="text-sm font-medium text-slate-700">{flag.label}</span>
                <p className="text-xs text-slate-400">{flag.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Chef Flag Table */}
      {chefs.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-700">Per-Chef Flag State</h2>
            <p className="text-xs text-slate-400 mt-0.5">Toggle controls coming soon — use direct DB edits for now</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500">Chef</th>
                  {KNOWN_FLAGS.map((flag) => (
                    <th key={flag.key} className="text-center px-3 py-2.5 text-xs font-medium text-slate-500 max-w-[80px]">
                      <span className="font-mono">{flag.key.replace(/_/g, '_\u200B')}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chefs.map((chef) => {
                  const flags = flagsByChef[chef.id] ?? {}
                  return (
                    <tr key={chef.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {chef.business_name ?? 'Unnamed'}
                      </td>
                      {KNOWN_FLAGS.map((flag) => (
                        <td key={flag.key} className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-block w-2.5 h-2.5 rounded-full ${
                              flags[flag.key] ? 'bg-green-500' : 'bg-slate-200'
                            }`}
                            title={flags[flag.key] ? 'Enabled' : 'Disabled'}
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {chefs.length === 0 && !note && (
        <div className="bg-white rounded-xl border border-slate-200 py-12 text-center text-sm text-slate-400">
          No chefs found.
        </div>
      )}
    </div>
  )
}
