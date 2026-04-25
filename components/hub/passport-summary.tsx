'use client'

import { formatCurrency } from '@/lib/utils/currency'
import type { ClientPassport } from '@/lib/hub/types'

const AUTONOMY_LABELS: Record<string, string> = {
  full: 'Full autonomy (decide everything)',
  high: 'High autonomy (decide most things)',
  moderate: 'Moderate (propose, client approves)',
  low: 'Low (client directs)',
}

const STYLE_LABELS: Record<string, string> = {
  formal_plated: 'Formal plated',
  family_style: 'Family style',
  buffet: 'Buffet',
  cocktail: 'Cocktail',
  tasting_menu: 'Tasting menu',
  no_preference: 'No preference',
}

const COMM_LABELS: Record<string, string> = {
  direct: 'Direct with client',
  delegate_only: 'Through assistant only',
  delegate_preferred: 'Assistant preferred',
}

export function PassportSummary({ passport }: { passport: ClientPassport }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3 dark:border-zinc-700 dark:bg-zinc-800/50">
      <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
        Client Passport
      </h3>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {passport.chef_autonomy_level && (
          <Field
            label="Chef autonomy"
            value={AUTONOMY_LABELS[passport.chef_autonomy_level] || passport.chef_autonomy_level}
          />
        )}

        {passport.communication_mode && (
          <Field
            label="Communication"
            value={COMM_LABELS[passport.communication_mode] || passport.communication_mode}
          />
        )}

        {passport.service_style && (
          <Field
            label="Service style"
            value={STYLE_LABELS[passport.service_style] || passport.service_style}
          />
        )}

        {passport.default_guest_count && (
          <Field label="Typical headcount" value={String(passport.default_guest_count)} />
        )}

        {(passport.budget_range_min_cents || passport.budget_range_max_cents) && (
          <Field
            label="Budget range"
            value={`${passport.budget_range_min_cents ? formatCurrency(passport.budget_range_min_cents) : '?'} - ${passport.budget_range_max_cents ? formatCurrency(passport.budget_range_max_cents) : '?'}`}
          />
        )}

        {passport.max_interaction_rounds && (
          <Field label="Max interaction rounds" value={String(passport.max_interaction_rounds)} />
        )}

        {passport.preferred_contact_method && (
          <Field label="Preferred contact" value={passport.preferred_contact_method} />
        )}
      </div>

      {passport.standing_instructions && (
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <p className="text-xs font-medium text-zinc-500 mb-1">Standing Instructions</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {passport.standing_instructions}
          </p>
        </div>
      )}

      {passport.default_locations && passport.default_locations.length > 0 && (
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <p className="text-xs font-medium text-zinc-500 mb-1">Known Locations</p>
          <div className="flex flex-wrap gap-2">
            {passport.default_locations.map((loc, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-700"
              >
                {loc.label} ({loc.city}, {loc.state})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-zinc-800 dark:text-zinc-200">{value}</p>
    </div>
  )
}
