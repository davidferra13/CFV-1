// How-to-Earn Panel - Client-facing
// Explains every way a client can earn loyalty points.
// All data is config-driven from the chef's loyalty_config.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LoyaltyConfig, EarnMode } from '@/lib/loyalty/actions'

type ActiveTrigger = {
  key: string
  label: string
  description: string
  points: number
  category: string
  enabled: boolean
}

type Props = {
  config: Pick<
    LoyaltyConfig,
    | 'points_per_guest'
    | 'bonus_large_party_threshold'
    | 'bonus_large_party_points'
    | 'milestone_bonuses'
    | 'guest_milestones'
    | 'welcome_points'
    | 'referral_points'
  > & {
    earn_mode?: EarnMode
    points_per_dollar?: number
    points_per_event?: number
    base_points_per_event?: number
  }
  activeTriggers?: ActiveTrigger[]
}

function EarnRow({ emoji, label, points }: { emoji: string; label: string; points: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-stone-800 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="text-xl w-7 text-center">{emoji}</span>
        <span className="text-sm text-stone-300">{label}</span>
      </div>
      <span className="text-sm font-bold text-emerald-700 shrink-0 ml-4">+{points}</span>
    </div>
  )
}

const TRIGGER_EMOJIS: Record<string, string> = {
  profile_completed: '📝',
  fun_qa_completed: '🎭',
  review_submitted: '⭐',
  google_review_clicked: '🔗',
  public_review_consent: '📢',
  quote_accepted: '✅',
  payment_on_time: '💳',
  tip_added: '💝',
  rsvp_collected: '📩',
  menu_approved: '🍽️',
  meal_feedback_given: '💬',
  chat_engagement: '💬',
  hub_group_created: '👥',
  friend_invited: '🤝',
}

export function HowToEarnPanel({ config, activeTriggers }: Props) {
  const enabledTriggers = (activeTriggers || []).filter((t) => t.enabled && t.points > 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle>How to Earn Points</CardTitle>
        <p className="text-sm text-stone-500 mt-1">
          Points are tracked automatically. You never need to ask for them.
        </p>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-stone-800">
          {/* Welcome bonus */}
          {(config.welcome_points ?? 0) > 0 && (
            <EarnRow
              emoji="👋"
              label="Join the loyalty program (one-time welcome bonus)"
              points={`${config.welcome_points} pts`}
            />
          )}

          {/* Base event bonus (hybrid mode) */}
          {(config.base_points_per_event ?? 0) > 0 && (
            <EarnRow
              emoji="📅"
              label={`Base event bonus: +${config.base_points_per_event} pts every time you complete a dinner`}
              points={`${config.base_points_per_event} pts / event`}
            />
          )}

          {/* Base earn - varies by earn mode */}
          {(!config.earn_mode || config.earn_mode === 'per_guest') && (
            <EarnRow
              emoji="🍽️"
              label={`Each guest you bring to a dinner - ${config.points_per_guest} pts per guest`}
              points={`${config.points_per_guest} pts / guest`}
            />
          )}
          {config.earn_mode === 'per_dollar' && (
            <EarnRow
              emoji="💰"
              label={`For every dollar spent on your event - ${config.points_per_dollar ?? 1} pts per dollar`}
              points={`${config.points_per_dollar ?? 1} pts / $1`}
            />
          )}
          {config.earn_mode === 'per_event' && (
            <EarnRow
              emoji="📅"
              label={`Flat ${config.points_per_event ?? 100} pts every time you book and complete a dinner`}
              points={`${config.points_per_event ?? 100} pts / event`}
            />
          )}

          {/* Large party bonus */}
          {config.bonus_large_party_threshold && (config.bonus_large_party_points ?? 0) > 0 && (
            <EarnRow
              emoji="🎉"
              label={`Large party bonus - when you bring ${config.bonus_large_party_threshold}+ guests`}
              points={`+${config.bonus_large_party_points} bonus`}
            />
          )}

          {/* Milestone bonuses */}
          {(config.milestone_bonuses ?? []).length > 0 &&
            config.milestone_bonuses.map((m) => (
              <EarnRow
                key={m.events}
                emoji="🏆"
                label={`Milestone: complete your ${ordinal(m.events)} dinner`}
                points={`+${m.bonus} bonus`}
              />
            ))}

          {/* Guest milestones */}
          {(config.guest_milestones ?? []).length > 0 &&
            config.guest_milestones.map((m) => (
              <EarnRow
                key={`g${m.guests}`}
                emoji="👥"
                label={`Guest milestone: serve ${m.guests} total guests`}
                points={`+${m.bonus} bonus`}
              />
            ))}

          {/* Referrals (automatic) */}
          <EarnRow
            emoji="💌"
            label={`Refer a friend who completes their first event${(config.referral_points ?? 0) > 0 ? ` (+${config.referral_points} pts)` : ''}`}
            points={(config.referral_points ?? 0) > 0 ? `+${config.referral_points} pts` : 'varies'}
          />

          {/* Chef bonus */}
          <EarnRow
            emoji="⭐"
            label="Special bonus at your chef's discretion (thank-you, occasion gift, etc.)"
            points="varies"
          />

          {/* Active triggers (bonus ways to earn) */}
          {enabledTriggers.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">
                  Bonus Ways to Earn
                </p>
              </div>
              {enabledTriggers.map((trigger) => (
                <EarnRow
                  key={trigger.key}
                  emoji={TRIGGER_EMOJIS[trigger.key] || '✨'}
                  label={trigger.description || trigger.label}
                  points={`+${trigger.points} pts`}
                />
              ))}
            </>
          )}
        </div>

        <div className="mt-4 p-3 bg-stone-800 rounded-lg">
          <p className="text-xs text-stone-500 leading-relaxed">
            Points are awarded automatically when your chef marks an event as completed. They appear
            in your transaction history within minutes. Your tier is based on your{' '}
            <span className="font-medium">lifetime points earned</span> - it never goes down, even
            when you redeem rewards.
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
