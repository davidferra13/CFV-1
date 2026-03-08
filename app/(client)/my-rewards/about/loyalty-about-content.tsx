'use client'

import Link from 'next/link'
import { LoyaltyProgramSimulator } from '@/components/loyalty/loyalty-program-simulator'
import type {
  LoyaltyProgramConfig,
  LoyaltyProgramReward,
  LoyaltySimulationStartingProgress,
} from '@/lib/loyalty/simulator'
import {
  GuideSection,
  GuideParagraph,
  GuideStrong,
  GuideStat,
  GuideStatRow,
  GuideTable,
  GuideCallout,
  GuideBullet,
  GuideBulletList,
  GuideBrandCard,
  GuideHero,
  GuideRankList,
} from '@/components/loyalty/guide-sections'

type Props = {
  simulatorConfig: LoyaltyProgramConfig
  simulatorRewards: LoyaltyProgramReward[]
  initialProgress?: LoyaltySimulationStartingProgress
}

export function LoyaltyAboutContent({ simulatorConfig, simulatorRewards, initialProgress }: Props) {
  return (
    <div className="space-y-4">
      {/* ─── Hero ─── */}
      <GuideHero
        title="Your Loyalty, Rewarded"
        subtitle="Every dinner you book earns you points toward complimentary courses, upgrades, and exclusive experiences. The more you dine, the more you're rewarded."
      >
        <Link
          href="/my-rewards"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-stone-900 bg-brand-500 hover:bg-brand-400 transition-colors"
        >
          View My Rewards &rarr;
        </Link>
      </GuideHero>

      {/* ─── Quick Feature Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <GuideBrandCard icon="✨" title="Earn Automatically">
          Points are awarded every time your chef completes an event. No cards to scan, no codes to
          remember — it just happens.
        </GuideBrandCard>
        <GuideBrandCard icon="🎁" title="Redeem Your Way">
          Choose from a curated menu of rewards — complimentary courses, discounts, upgrades, and
          more. Redeem when you&rsquo;re ready.
        </GuideBrandCard>
        <GuideBrandCard icon="🏅" title="Rise Through the Ranks">
          Progress from Bronze to Platinum as you dine. Higher tiers mean you&rsquo;re recognized as
          one of your chef&rsquo;s most valued clients.
        </GuideBrandCard>
      </div>

      {/* ─── How You Earn ─── */}
      <GuideSection
        title="How You Earn Points"
        icon="🌟"
        summary="Points are earned automatically when your chef completes an event. Bigger parties and milestones earn you even more."
        defaultOpen
      >
        <GuideTable
          headers={['How', 'What happens', 'Example']}
          rows={[
            [
              'Every event',
              'Earn points for each guest at your dinner',
              '8-guest dinner = 80 points',
            ],
            [
              'Large parties',
              'Bonus points when your guest count exceeds a threshold',
              '12 guests? Extra 50 bonus points',
            ],
            [
              'Milestones',
              'Celebrate your 5th dinner, 10th dinner, and beyond',
              '10th dinner = 100 bonus points',
            ],
            ['Welcome bonus', 'A head start when you first join', 'Immediate points on signup'],
            [
              'Special bonuses',
              'Your chef may award bonus points for referrals, birthdays, and more',
              'Varies — a personal touch',
            ],
          ]}
        />

        <GuideCallout type="tip">
          You don&rsquo;t need to do anything special to earn points. They&rsquo;re awarded
          automatically after every event. Just keep dining and watch your balance grow.
        </GuideCallout>
      </GuideSection>

      {/* ─── Tiers ─── */}
      <GuideSection
        title="Your Tier Journey"
        icon="📈"
        summary="Progress through four tiers based on your lifetime dining history. Higher tiers mean greater recognition — and your tier never goes down."
      >
        <div className="space-y-3">
          <div className="rounded-lg p-4 border border-amber-900/30 bg-amber-950/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🥉</span>
              <span className="text-sm font-semibold text-amber-200">Bronze</span>
            </div>
            <p className="text-sm text-stone-400">
              Where everyone starts. You&rsquo;re already earning points from day one.
            </p>
          </div>
          <div className="rounded-lg p-4 border border-stone-500/30 bg-stone-700/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🥈</span>
              <span className="text-sm font-semibold text-stone-200">Silver</span>
            </div>
            <p className="text-sm text-stone-400">
              A developing relationship. You&rsquo;re becoming a regular — and your chef notices.
            </p>
          </div>
          <div className="rounded-lg p-4 border border-yellow-700/30 bg-yellow-950/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🥇</span>
              <span className="text-sm font-semibold text-yellow-200">Gold</span>
            </div>
            <p className="text-sm text-stone-400">
              A loyal, regular client. You&rsquo;ve built a real connection and your commitment
              shows.
            </p>
          </div>
          <div className="rounded-lg p-4 border border-indigo-700/30 bg-indigo-950/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">💎</span>
              <span className="text-sm font-semibold text-indigo-200">Platinum</span>
            </div>
            <p className="text-sm text-stone-400">
              The inner circle. You&rsquo;re among your chef&rsquo;s most valued clients — and
              you&rsquo;re recognized for it.
            </p>
          </div>
        </div>

        <GuideCallout type="tip">
          <GuideStrong>Your tier never goes down.</GuideStrong> Once you reach Gold, you stay Gold —
          even after redeeming points. Tiers are based on your lifetime history with your chef, not
          your current balance.
        </GuideCallout>
      </GuideSection>

      {/* ─── Rewards ─── */}
      <GuideSection
        title="Try Your Own Scenario"
        icon="Plan"
        summary="Plug in party size and repeat dinners to see how this real loyalty program behaves from your current starting point."
      >
        <LoyaltyProgramSimulator
          title="Model your next run of dinners"
          subtitle="This planner uses your chef's live rules, tier thresholds, and reward catalog. Move the sliders to see what unlocks and when."
          config={simulatorConfig}
          rewards={simulatorRewards}
          initialProgress={initialProgress}
          initialGuestsPerEvent={2}
          initialPlannedEvents={5}
        />
      </GuideSection>

      <GuideSection
        title="What You Can Earn"
        icon="🎁"
        summary="Your chef offers a curated menu of rewards — from complimentary courses to full dinner experiences. Every reward is a personal touch."
      >
        <GuideParagraph>
          Unlike a coffee shop giving you a free latte, your rewards are{' '}
          <GuideStrong>handcrafted by your chef.</GuideStrong> A complimentary dessert course means
          your chef personally creates something special for your table. An upgrade means an
          elevated experience designed just for you.
        </GuideParagraph>

        <GuideTable
          headers={['Reward type', 'What you get']}
          rows={[
            [
              'Complimentary course',
              "An extra course added to your dinner — appetizer, dessert, or chef's choice",
            ],
            ['Discount', 'A fixed amount or percentage off your next event'],
            ['Service upgrade', "An elevated dining experience — like a chef's tasting menu"],
            ['Complimentary dinner', 'A full dinner on the house'],
          ]}
        />

        <GuideParagraph>
          Browse available rewards on your <GuideStrong>My Rewards</GuideStrong> page. When you have
          enough points, simply tap &ldquo;Redeem&rdquo; and your chef will be notified.
          They&rsquo;ll deliver the reward at your next event.
        </GuideParagraph>
      </GuideSection>

      {/* ─── How Redemption Works ─── */}
      <GuideSection
        title="How Redemption Works"
        icon="🔄"
        summary="Redeem points for rewards with a single tap. Your chef handles the rest."
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="shrink-0 h-7 w-7 rounded-full bg-brand-500/20 text-brand-500 text-xs font-bold flex items-center justify-center mt-0.5">
              1
            </span>
            <div>
              <p className="text-sm font-medium text-stone-200">Choose a reward</p>
              <p className="text-sm text-stone-400">
                Browse available rewards and pick the one you want.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0 h-7 w-7 rounded-full bg-brand-500/20 text-brand-500 text-xs font-bold flex items-center justify-center mt-0.5">
              2
            </span>
            <div>
              <p className="text-sm font-medium text-stone-200">Tap &ldquo;Redeem&rdquo;</p>
              <p className="text-sm text-stone-400">
                Points are deducted and your chef is notified immediately.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0 h-7 w-7 rounded-full bg-brand-500/20 text-brand-500 text-xs font-bold flex items-center justify-center mt-0.5">
              3
            </span>
            <div>
              <p className="text-sm font-medium text-stone-200">Your chef delivers</p>
              <p className="text-sm text-stone-400">
                At your next event, your reward is fulfilled — a personal touch, not an automated
                coupon.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0 h-7 w-7 rounded-full bg-brand-500/20 text-brand-500 text-xs font-bold flex items-center justify-center mt-0.5">
              4
            </span>
            <div>
              <p className="text-sm font-medium text-stone-200">Track your rewards</p>
              <p className="text-sm text-stone-400">
                See all your pending and delivered rewards on your My Rewards page.
              </p>
            </div>
          </div>
        </div>
      </GuideSection>

      {/* ─── FAQ ─── */}
      <GuideSection
        title="Frequently Asked Questions"
        icon="❓"
        summary="Quick answers to common questions about how the rewards program works."
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-stone-200">Do my points expire?</p>
            <p className="text-sm text-stone-400 mt-1">
              Your chef sets the expiration policy. In most cases, points remain active as long as
              you continue dining. Check your My Rewards page for details specific to your
              chef&rsquo;s program.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-stone-200">Can my tier go down?</p>
            <p className="text-sm text-stone-400 mt-1">
              No. Tiers are based on your lifetime dining history and never decrease. Once you reach
              Gold, you stay Gold — even after redeeming points.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-stone-200">Do I earn points on every event?</p>
            <p className="text-sm text-stone-400 mt-1">
              Points are awarded automatically when your chef marks an event as completed. You
              don&rsquo;t need to do anything extra — no codes, no cards, no check-ins.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-stone-200">
              What happens when I redeem a reward?
            </p>
            <p className="text-sm text-stone-400 mt-1">
              Your points are deducted immediately and your chef is notified. The reward enters a
              pending state until your chef delivers it at your next event. You can track the status
              on your My Rewards page.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-stone-200">Can I earn rewards faster?</p>
            <p className="text-sm text-stone-400 mt-1">
              Yes! Larger parties earn more base points, and milestone bonuses reward your loyalty
              at key moments (like your 5th or 10th dinner). Some chefs also award bonus points for
              referrals and special occasions.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-stone-200">How do I see my points balance?</p>
            <p className="text-sm text-stone-400 mt-1">
              Your current balance, tier, progress, and transaction history are all visible on your{' '}
              <Link
                href="/my-rewards"
                className="text-brand-500 hover:text-brand-400 underline underline-offset-2"
              >
                My Rewards
              </Link>{' '}
              page.
            </p>
          </div>
        </div>
      </GuideSection>

      {/* ─── Bottom CTA ─── */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background:
            'linear-gradient(135deg, rgba(232, 143, 71, 0.08) 0%, rgba(28, 25, 23, 1) 60%)',
          border: '1px solid rgba(232, 143, 71, 0.15)',
        }}
      >
        <p className="text-lg font-semibold text-stone-100">Ready to see where you stand?</p>
        <p className="text-sm text-stone-400 mt-1">
          Check your balance, browse available rewards, and track your progress.
        </p>
        <Link
          href="/my-rewards"
          className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold text-stone-900 bg-brand-500 hover:bg-brand-400 transition-colors"
        >
          Go to My Rewards &rarr;
        </Link>
      </div>
    </div>
  )
}
