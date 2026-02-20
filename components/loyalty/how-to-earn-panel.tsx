// How-to-Earn Panel — Client-facing
// Explains every way a client can earn loyalty points.
// All data is config-driven from the chef's loyalty_config.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LoyaltyConfig } from '@/lib/loyalty/actions'

type Props = {
  config: Pick<
    LoyaltyConfig,
    | 'points_per_guest'
    | 'bonus_large_party_threshold'
    | 'bonus_large_party_points'
    | 'milestone_bonuses'
    | 'welcome_points'
  >
}

function EarnRow({ emoji, label, points }: { emoji: string; label: string; points: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-stone-100 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="text-xl w-7 text-center">{emoji}</span>
        <span className="text-sm text-stone-700">{label}</span>
      </div>
      <span className="text-sm font-bold text-emerald-700 shrink-0 ml-4">+{points}</span>
    </div>
  )
}

export function HowToEarnPanel({ config }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How to Earn Points</CardTitle>
        <p className="text-sm text-stone-500 mt-1">
          Points are tracked automatically. You never need to ask for them.
        </p>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-stone-100">

          {/* Welcome bonus */}
          {(config.welcome_points ?? 0) > 0 && (
            <EarnRow
              emoji="👋"
              label="Join the loyalty program (one-time welcome bonus)"
              points={`${config.welcome_points} pts`}
            />
          )}

          {/* Per-guest base points */}
          <EarnRow
            emoji="🍽️"
            label={`Each guest you bring to a dinner — ${config.points_per_guest} pts per guest`}
            points={`${config.points_per_guest} pts / guest`}
          />

          {/* Large party bonus */}
          {config.bonus_large_party_threshold && (config.bonus_large_party_points ?? 0) > 0 && (
            <EarnRow
              emoji="🎉"
              label={`Large party bonus — when you bring ${config.bonus_large_party_threshold}+ guests`}
              points={`+${config.bonus_large_party_points} bonus`}
            />
          )}

          {/* Milestone bonuses */}
          {(config.milestone_bonuses ?? []).length > 0 && config.milestone_bonuses.map((m) => (
            <EarnRow
              key={m.events}
              emoji="🏆"
              label={`Milestone: complete your ${ordinal(m.events)} dinner`}
              points={`+${m.bonus} bonus`}
            />
          ))}

          {/* Referrals (informational) */}
          <EarnRow
            emoji="💌"
            label="Refer a friend who books a dinner (chef awards manually)"
            points="varies"
          />

          {/* Chef bonus */}
          <EarnRow
            emoji="⭐"
            label="Special bonus at your chef's discretion (thank-you, occasion gift, etc.)"
            points="varies"
          />
        </div>

        <div className="mt-4 p-3 bg-stone-50 rounded-lg">
          <p className="text-xs text-stone-500 leading-relaxed">
            Points are awarded automatically when your chef marks an event as completed.
            They appear in your transaction history within minutes.
            Your tier is based on your <span className="font-medium">lifetime points earned</span> —
            it never goes down, even when you redeem rewards.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
