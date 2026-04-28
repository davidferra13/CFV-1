'use client'

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
  GuideSubHeader,
  GuideRankList,
} from '@/components/loyalty/guide-sections'
import { detectEmotion } from '@/lib/ai/remy-emotion'
import type { RemyEmotion } from '@/lib/ai/remy-visemes'
import type { LoyaltyFeedbackEmotionItem } from '@/lib/loyalty/feedback-emotion-types'

const EMOTION_STYLES: Record<RemyEmotion, string> = {
  neutral: 'border-stone-700 bg-stone-800/50 text-stone-300',
  happy: 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300',
  surprised: 'border-brand-800/60 bg-brand-950/30 text-brand-300',
  sad: 'border-sky-800/60 bg-sky-950/30 text-sky-300',
  angry: 'border-red-800/60 bg-red-950/30 text-red-300',
}

const SOURCE_LABELS: Record<LoyaltyFeedbackEmotionItem['source'], string> = {
  client_review: 'Client review',
  guest_feedback: 'Guest feedback',
  logged_feedback: 'Logged feedback',
}

function FeedbackEmotionPanel({
  items,
  error,
}: {
  items: LoyaltyFeedbackEmotionItem[]
  error: string | null
}) {
  return (
    <div className="rounded-lg border border-stone-700/30 bg-stone-900/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Recent feedback resonance
          </p>
          <p className="mt-1 text-sm text-stone-400">
            Deterministic emotion labels from real reviews and feedback already on file.
          </p>
        </div>
        <span className="rounded-full border border-stone-700 px-2.5 py-1 text-xs text-stone-400">
          {items.length} item{items.length === 1 ? '' : 's'}
        </span>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-300">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-3 rounded-lg border border-stone-800 bg-stone-950/40 px-3 py-2 text-sm text-stone-400">
          No written client or guest feedback is available yet. Once reviews, guest feedback, or
          logged testimonials exist, emotion labels will appear here.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.slice(0, 5).map((item) => {
            const emotion = detectEmotion(item.text)
            return (
              <div key={item.id} className="rounded-lg border border-stone-800 bg-stone-950/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs capitalize ${EMOTION_STYLES[emotion]}`}
                  >
                    {emotion}
                  </span>
                  <span className="text-xs text-stone-500">{SOURCE_LABELS[item.source]}</span>
                  {item.rating ? (
                    <span className="text-xs text-stone-500">{item.rating}/5</span>
                  ) : null}
                  {item.eventLabel ? (
                    <span className="text-xs text-stone-600">{item.eventLabel}</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-medium text-stone-200">{item.reviewerName}</p>
                <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-stone-400">
                  {item.text}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function LoyaltyGuideContent({
  feedbackItems,
  feedbackError,
}: {
  feedbackItems: LoyaltyFeedbackEmotionItem[]
  feedbackError: string | null
}) {
  return (
    <div className="space-y-3">
      {/* ─── 1. What Is a Loyalty Program? ─── */}
      <GuideSection
        title="What Is a Loyalty Program?"
        icon="📖"
        summary="The definitions, how the terms relate to each other, and the key vocabulary every program designer should know."
        defaultOpen
      >
        <GuideParagraph>
          A loyalty program is a structured way to reward your clients for choosing you again and
          again. At its simplest, it&rsquo;s an agreement:{' '}
          <GuideStrong>the more you book with me, the more value you get back.</GuideStrong>
        </GuideParagraph>
        <GuideParagraph>
          You&rsquo;ve been part of loyalty programs your whole life - coffee shop stamp cards,
          airline miles, Amazon Prime. They all work on the same principle: make staying feel more
          rewarding than leaving.
        </GuideParagraph>

        <GuideSubHeader>How the terms relate</GuideSubHeader>
        <GuideBulletList>
          <GuideBullet>
            <GuideStrong>Loyalty program</GuideStrong> is the big umbrella - any system designed to
            keep clients coming back. Includes points, memberships, VIP treatment, and more.
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Rewards program</GuideStrong> is a type of loyalty program where clients
            earn something back for their patronage. Starbucks Stars, airline miles - these are
            rewards programs.
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Points program</GuideStrong> is a type of rewards program that uses virtual
            currency (points, stars, miles) as the earning mechanism.
          </GuideBullet>
        </GuideBulletList>
        <GuideParagraph>
          Think of it like nesting dolls. All points programs are rewards programs. All rewards
          programs are loyalty programs. But not all loyalty programs use points - Amazon Prime and
          Costco memberships are loyalty programs with no points at all.
        </GuideParagraph>

        <GuideSubHeader>Key vocabulary</GuideSubHeader>
        <GuideTable
          headers={['Term', 'What it means']}
          rows={[
            ['Earn rate', 'How fast clients accumulate rewards (e.g., "10 pts per guest")'],
            [
              'Breakage',
              'Percentage of earned rewards that are never redeemed - this is actually profit',
            ],
            [
              'Redemption rate',
              'Percentage of points that clients actually use (opposite of breakage)',
            ],
            [
              'CLV / LTV',
              'Customer Lifetime Value - total revenue from one client over your whole relationship',
            ],
            ['Churn', 'Rate at which clients stop booking with you'],
          ]}
        />
      </GuideSection>

      {/* ─── 2. Why Loyalty Programs Matter ─── */}
      <GuideSection
        title="Why Loyalty Programs Matter"
        icon="📈"
        summary="The economics are clear: keeping clients is dramatically more profitable than finding new ones. Here are the numbers."
      >
        <GuideStatRow>
          <GuideStat value="5-25x" label="More expensive to acquire a new client than keep one" />
          <GuideStat value="67%" label="More spent by returning clients vs. first-timers" />
          <GuideStat value="25%+" label="Profit increase from just 5% better retention" />
          <GuideStat value="60-70%" label="Chance of booking an existing client" />
          <GuideStat value="5-20%" label="Chance of booking a brand-new lead" />
          <GuideStat value="$7.93" label="Average return per $1 invested by year three" />
        </GuideStatRow>

        <GuideParagraph>
          For private chefs, these numbers are even more impactful. Every lost client represents
          thousands of dollars in lifetime value, and finding a replacement costs real time and
          money. A loyalty program doesn&rsquo;t just reward purchases - it deepens the relationship
          and makes your best clients feel recognized.
        </GuideParagraph>

        <GuideCallout type="insight">
          <GuideStrong>83-90% of loyalty programs</GuideStrong> deliver positive ROI. The average
          return is $2.71 per dollar invested in year one, climbing to $7.93 by year three as the
          program matures and the client base compounds.
        </GuideCallout>
      </GuideSection>

      {/* ─── 3. Types of Loyalty Programs ─── */}
      <GuideSection
        title="Types of Loyalty Programs"
        icon="🗂️"
        summary="Points, punch cards, tiers, cashback, memberships - every model explained with pros, cons, and when each one works best."
      >
        <GuideSubHeader>Points-based</GuideSubHeader>
        <GuideParagraph>
          Clients earn points for every qualifying action (booking, bringing guests, referrals).
          Points accumulate and are redeemed for rewards. <GuideStrong>Examples:</GuideStrong>{' '}
          Starbucks Stars, Sephora Beauty Insider, airline miles.
        </GuideParagraph>
        <GuideParagraph>
          <GuideStrong>Best for:</GuideStrong> Flexible businesses that want to tune earn rates and
          bonuses independently. <GuideStrong>Watch out for:</GuideStrong> Making the math too
          complicated - if a client needs a calculator, the program will fail.
        </GuideParagraph>

        <GuideSubHeader>Visit-based (punch card)</GuideSubHeader>
        <GuideParagraph>
          Every qualifying visit earns a &ldquo;stamp.&rdquo; After a set number, the client gets a
          reward. The classic &ldquo;Buy 9, get the 10th free&rdquo; model.
        </GuideParagraph>
        <GuideParagraph>
          <GuideStrong>Best for:</GuideStrong> Frequent, uniform-price purchases (coffee, haircuts).
          <GuideStrong> Not ideal for:</GuideStrong> Private chefs - events vary widely in size and
          price, so a flat stamp misses the nuance.
        </GuideParagraph>

        <GuideSubHeader>Tiered programs (Bronze / Silver / Gold)</GuideSubHeader>
        <GuideParagraph>
          Clients are placed into tiers based on their loyalty level. Higher tiers unlock better
          perks and recognition. <GuideStrong>Examples:</GuideStrong> Sephora (Insider/VIB/Rouge),
          airline programs, Marriott Bonvoy.
        </GuideParagraph>
        <GuideParagraph>
          Tiers tap into something deeply human - the desire for status. Being called a &ldquo;Gold
          client&rdquo; feels meaningful in ways that &ldquo;you have 847 points&rdquo;
          doesn&rsquo;t. Once someone achieves a high tier, leaving means losing that status.
        </GuideParagraph>

        <GuideSubHeader>Spend-based / cashback</GuideSubHeader>
        <GuideParagraph>
          Clients receive a percentage of spending back as credit. Everyone understands &ldquo;5%
          back.&rdquo; <GuideStrong>Watch out:</GuideStrong> Creates transactional loyalty - clients
          stay for the deal, not for you. If someone offers a better rate, they leave.
        </GuideParagraph>

        <GuideSubHeader>Paid membership (Amazon Prime model)</GuideSubHeader>
        <GuideParagraph>
          Clients pay an annual fee for exclusive benefits. The psychology is powerful - once
          someone pays, they feel compelled to &ldquo;get their money&rsquo;s worth.&rdquo; Prime
          members spend <GuideStrong>2.3x more</GuideStrong> than non-members and renew at a
          <GuideStrong> 98% rate.</GuideStrong>
        </GuideParagraph>

        <GuideCallout type="tip">
          The most successful real-world programs are <GuideStrong>hybrids</GuideStrong> - Starbucks
          combines points + tiers + gamified challenges. ChefFlow uses points + tiers + milestone
          bonuses, which is the right combination for premium, relationship-driven services.
        </GuideCallout>
      </GuideSection>

      {/* ─── 4. The Psychology ─── */}
      <GuideSection
        title="The Psychology - Why They Work"
        icon="🧠"
        summary="The behavioral science behind loyalty programs: the head start effect, loss aversion, the finish line effect, and the power of surprise."
      >
        <GuideSubHeader>The head start effect</GuideSubHeader>
        <GuideParagraph>
          In a famous study, car wash customers who received a loyalty card with 2 free pre-stamps
          (needing 8 more) were <GuideStrong>nearly twice as likely</GuideStrong> to complete the
          card as those starting from zero (also needing 8). The task was identical - but feeling
          like you&rsquo;ve already started is a powerful motivator.
        </GuideParagraph>
        <GuideParagraph>
          This is why welcome bonuses matter. Giving new clients a few points on signup makes them
          feel like they&rsquo;re already on their way to a reward, not starting from scratch.
        </GuideParagraph>

        <GuideSubHeader>Loss aversion</GuideSubHeader>
        <GuideParagraph>
          Losing something hurts about <GuideStrong>twice as much</GuideStrong> as gaining the same
          thing feels good. A message like &ldquo;Your 500 points expire in 30 days&rdquo; motivates
          action far more than &ldquo;Earn 500 bonus points this month.&rdquo;
        </GuideParagraph>
        <GuideCallout type="warning">
          Use this carefully. If you expire points too aggressively or without warning, it creates
          resentment, not motivation. The difference between &ldquo;motivated&rdquo; and
          &ldquo;angry&rdquo; is communication and fairness.
        </GuideCallout>

        <GuideSubHeader>The finish line effect</GuideSubHeader>
        <GuideParagraph>
          People naturally speed up as they approach a goal. In a &ldquo;buy 10, get 1 free&rdquo;
          study, time between purchases <GuideStrong>decreased by about 20%</GuideStrong> as
          customers approached their 10th stamp. This is why progress indicators matter - showing
          &ldquo;You&rsquo;re 2 events away from Gold status&rdquo; creates real behavioral change.
        </GuideParagraph>

        <GuideSubHeader>Status and recognition</GuideSubHeader>
        <GuideParagraph>
          Being categorized as &ldquo;Gold&rdquo; or &ldquo;VIP&rdquo; satisfies a deep human need.
          For private chefs, this is especially powerful - your clients aren&rsquo;t anonymous
          shoppers. Recognizing their loyalty with a tier title carries real emotional weight.
        </GuideParagraph>

        <GuideSubHeader>The power of surprise</GuideSubHeader>
        <GuideParagraph>
          A planned reward (&ldquo;you earned 50 points&rdquo;) satisfies. A surprise reward
          (&ldquo;here&rsquo;s a complimentary appetizer course, just because you&rsquo;ve been a
          wonderful client&rdquo;) creates <GuideStrong>loyalty</GuideStrong>. The key is that
          it&rsquo;s unexpected - not part of the standard earn-and-redeem cycle.
        </GuideParagraph>
      </GuideSection>

      {/* ─── 5. What the Best Brands Do ─── */}
      <GuideSection
        title="What the Best Brands Do"
        icon="🏆"
        summary="What Starbucks, Amazon, Sephora, and Marriott get right - and what every successful program has in common."
      >
        <GuideTable
          headers={['Program', 'Key metric', 'What makes it work']}
          rows={[
            [
              'Starbucks Rewards',
              '60% of US revenue from members',
              'Simple earning, mobile-first, personalized challenges',
            ],
            [
              'Amazon Prime',
              '2.3x spend from members',
              'Sunk cost psychology - "I paid $139, I should use it"',
            ],
            [
              'Sephora Beauty Insider',
              '80% of NA sales from members',
              'Tier aspiration - Rouge customers get exclusive experiences',
            ],
            [
              'Marriott Bonvoy',
              'High retention across low-frequency stays',
              'Milestone recognition, experiential rewards, personal touch',
            ],
          ]}
        />

        <GuideCallout type="insight">
          <GuideStrong>Marriott Bonvoy is the closest parallel to private chefs.</GuideStrong>{' '}
          Hotels and chefs share the same challenge: high-value transactions, low frequency,
          personal relationships. Marriott uses milestone recognition, experiential rewards, and
          personal touch - not rapid-fire stamp cards.
        </GuideCallout>

        <GuideSubHeader>7 traits of every successful program</GuideSubHeader>
        <GuideBulletList>
          <GuideBullet>
            <GuideStrong>Simplicity</GuideStrong> - the earning mechanic is explainable in one
            sentence
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Clear value</GuideStrong> - the client always knows what they&rsquo;re
            getting
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Emotional connection</GuideStrong> - goes beyond transactions
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Visible progress</GuideStrong> - clients see how close they are to the next
            milestone
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Personal recognition</GuideStrong> - birthdays, milestones, &ldquo;we
            remember you&rdquo;
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Digital integration</GuideStrong> - balances and rewards accessible anytime
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Relevant rewards</GuideStrong> - things clients actually want, not things
            that are cheap to offer
          </GuideBullet>
        </GuideBulletList>
      </GuideSection>

      {/* ─── 6. The Reward Hierarchy for Premium Services ─── */}
      <GuideSection
        title="The Reward Hierarchy for Premium Services"
        icon="👑"
        summary="For affluent clients, discounts are the least effective lever. Here's what actually drives loyalty at the premium level."
      >
        <GuideParagraph>
          This is the single most important insight for private chefs: for premium clients,
          <GuideStrong>
            {' '}
            75% of what drives loyalty comes from emotional perks, not financial incentives.
          </GuideStrong>
        </GuideParagraph>

        <GuideRankList
          items={[
            {
              rank: 1,
              label: 'Recognition',
              description: '"You\'re one of our Gold clients" - personal acknowledgment',
            },
            {
              rank: 2,
              label: 'Access',
              description: 'Priority booking, first look at seasonal menus',
            },
            {
              rank: 3,
              label: 'Experiences',
              description: 'Exclusive tasting events, custom menu consultations',
            },
            {
              rank: 4,
              label: 'Convenience',
              description: 'Simplified rebooking, dedicated communication',
            },
            { rank: 5, label: 'Discounts', description: 'Percentage off, dollar amount off' },
          ]}
        />

        <GuideCallout type="tip">
          A complimentary amuse-bouche course at their next dinner creates more loyalty than $50 off
          ever will. Your clients can afford your services - what they value is being
          <GuideStrong> known, recognized, and given something special.</GuideStrong>
        </GuideCallout>

        <FeedbackEmotionPanel items={feedbackItems} error={feedbackError} />
      </GuideSection>

      {/* ─── 7. Rules of Thumb ─── */}
      <GuideSection
        title="Rules of Thumb"
        icon="📏"
        summary="Practical guidelines distilled from decades of research: earn rates, tier design, communication cadence, and expiration policies."
      >
        <GuideSubHeader>Earning</GuideSubHeader>
        <GuideBulletList>
          <GuideBullet>
            The value returned should be roughly <GuideStrong>3-8%</GuideStrong> of what clients
            spend. Below 3% feels miserly. Above 8% may be unsustainable.
          </GuideBullet>
          <GuideBullet>
            A client should earn their <GuideStrong>first reward within 2-3 bookings.</GuideStrong>{' '}
            If it takes longer, most disengage before they ever redeem.
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Welcome bonuses matter.</GuideStrong> A head start dramatically increases
            engagement (the car wash study).
          </GuideBullet>
        </GuideBulletList>

        <GuideSubHeader>Tiers</GuideSubHeader>
        <GuideBulletList>
          <GuideBullet>
            <GuideStrong>3-5 tiers is the sweet spot.</GuideStrong> Fewer than 3 = no
            differentiation. More than 5 = confusion.
          </GuideBullet>
          <GuideBullet>
            Most clients only think about <GuideStrong>two tiers:</GuideStrong> the one
            they&rsquo;re in and the one above.
          </GuideBullet>
          <GuideBullet>
            The top tier should represent your <GuideStrong>top 5-15%</GuideStrong> of clients. If
            40% are in the top tier, it&rsquo;s not special.
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Tiers should never decrease.</GuideStrong> Demoting loyal clients destroys
            trust.
          </GuideBullet>
        </GuideBulletList>

        <GuideSubHeader>Communication</GuideSubHeader>
        <GuideBulletList>
          <GuideBullet>
            <GuideStrong>85% of loyalty members</GuideStrong> never hear from the program after
            signup. Don&rsquo;t be one of those programs.
          </GuideBullet>
          <GuideBullet>
            Regular updates - &ldquo;You have 150 points, 50 from a free appetizer course&rdquo; -
            keep it alive.
          </GuideBullet>
          <GuideBullet>
            Milestone notifications (&ldquo;Congratulations on your 10th dinner!&rdquo;) create
            emotional connection.
          </GuideBullet>
        </GuideBulletList>

        <GuideSubHeader>Expiration</GuideSubHeader>
        <GuideBulletList>
          <GuideBullet>
            <GuideStrong>12-24 months of inactivity</GuideStrong> is the standard window if you use
            expiration.
          </GuideBullet>
          <GuideBullet>
            &ldquo;Inactivity-based&rdquo; is better than &ldquo;calendar-based.&rdquo; It rewards
            any engagement and only penalizes true dormancy.
          </GuideBullet>
          <GuideBullet>
            Always give <GuideStrong>plenty of warning</GuideStrong> before points expire. The goal
            is to bring clients back, not punish them.
          </GuideBullet>
        </GuideBulletList>

        <GuideSubHeader>Key benchmarks</GuideSubHeader>
        <GuideTable
          headers={['Metric', 'Healthy range']}
          rows={[
            ['Redemption rate', '40-60% (below 20% = nobody cares, above 80% = paying too much)'],
            ['Breakage', "10-20% (below 10% = too generous, above 30% = program isn't working)"],
            [
              'Active engagement',
              '~47-51% of enrolled members (average consumer is in 17 programs, active in 8)',
            ],
            ['Member satisfaction', '~46% industry-wide (more than half are unsatisfied)'],
            ['Programs with positive ROI', '83-90%'],
          ]}
        />
      </GuideSection>

      {/* ─── 8. Common Mistakes ─── */}
      <GuideSection
        title="Common Mistakes to Avoid"
        icon="🚫"
        summary="The eight things that kill loyalty programs - from making it too complicated to going silent after signup."
      >
        <GuideBulletList>
          <GuideBullet>
            <GuideStrong>Making it too complicated.</GuideStrong> If your client can&rsquo;t explain
            your program in one sentence, it&rsquo;s too complex.
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Setting the bar too high.</GuideStrong> 78% of consumers abandon programs
            where rewards feel unreachable. Make the first reward attainable quickly.
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Offering rewards nobody wants.</GuideStrong> Choose rewards that are
            valuable to your clients, not convenient for you.
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Going silent after signup.</GuideStrong> Enrolling clients and then never
            communicating their balance or status is the same as not having a program.
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Treating everyone the same.</GuideStrong> A client who has booked 30
            dinners and one who booked once should not receive the same treatment.
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Over-automating a personal business.</GuideStrong> Your program should
            enhance your personal touch, not replace it with generic notifications.
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Changing the rules.</GuideStrong> Devaluing points after clients have
            earned them destroys trust permanently.
          </GuideBullet>
          <GuideBullet>
            <GuideStrong>Set it and forget it.</GuideStrong> Programs that never evolve after launch
            have a 77% failure rate within two years.
          </GuideBullet>
        </GuideBulletList>

        <GuideCallout type="tip">
          The most effective loyalty gesture for a private chef might simply be: &ldquo;I remember
          you love wild mushrooms - I found an incredible local source this season and I&rsquo;m
          setting some aside for your next dinner.&rdquo; No points required.
        </GuideCallout>
      </GuideSection>

      {/* ─── 9. How Your ChefFlow Program Works ─── */}
      <GuideSection
        title="How Your ChefFlow Program Works"
        icon="🍽️"
        summary="A quick reference for how earning, tiers, rewards, and redemption work in your ChefFlow loyalty program."
      >
        <GuideSubHeader>How clients earn points</GuideSubHeader>
        <GuideTable
          headers={['Method', 'How it works', 'Automatic?']}
          rows={[
            ['Base event points', 'Points for every guest at a completed event', 'Yes'],
            ['Large party bonus', 'Extra points when guest count exceeds your threshold', 'Yes'],
            ['Milestone bonus', 'Bonus at the 5th dinner, 10th dinner, etc.', 'Yes'],
            ['Welcome bonus', 'Points on signup to give new clients a head start', 'Yes'],
            [
              'Manual bonus',
              'You award points anytime - referrals, birthdays, anything',
              'No (your call)',
            ],
          ]}
        />

        <GuideSubHeader>Tier progression</GuideSubHeader>
        <GuideParagraph>
          Clients progress through four tiers based on{' '}
          <GuideStrong>lifetime points earned</GuideStrong> (not current balance). Tiers never go
          down - even after redeeming points, a client keeps their tier status.
        </GuideParagraph>
        <GuideTable
          headers={['Tier', 'Default threshold', 'What it represents']}
          rows={[
            ['Bronze', '0 points', 'Every client starts here'],
            ['Silver', '200 points', 'A developing relationship'],
            ['Gold', '500 points', 'A loyal, regular client'],
            ['Platinum', '1,000 points', 'Your most valued clients'],
          ]}
        />

        <GuideSubHeader>Service-denominated rewards</GuideSubHeader>
        <GuideParagraph>
          Your rewards are always <GuideStrong>service-denominated</GuideStrong> - you&rsquo;re
          offering your time, talent, and creativity. A complimentary course costs you ingredients
          and effort, but to your client, it feels like a gift that only you can give.
        </GuideParagraph>
        <GuideTable
          headers={['Reward type', 'Example']}
          rows={[
            ['Free course', 'Complimentary appetizer or dessert course'],
            ['Fixed discount', '$25 off next dinner'],
            ['Percentage discount', '15% off a dinner for two'],
            ['Service upgrade', "Chef's tasting menu upgrade"],
            ['Free dinner', 'Complimentary dinner for two'],
          ]}
        />

        <GuideSubHeader>Redemption flow</GuideSubHeader>
        <GuideBulletList>
          <GuideBullet>
            Client redeems a reward from their portal - points deducted immediately
          </GuideBullet>
          <GuideBullet>
            The reward enters your <GuideStrong>Pending Deliveries</GuideStrong> queue
          </GuideBullet>
          <GuideBullet>You deliver the reward at their next event</GuideBullet>
          <GuideBullet>You mark it as delivered - you always stay in control</GuideBullet>
        </GuideBulletList>

        <GuideCallout type="tip">
          Everything is customizable from your <GuideStrong>Loyalty Settings</GuideStrong> page -
          earn rates, tier thresholds, milestones, and rewards. You can also turn the entire program
          on or off anytime with a single toggle.
        </GuideCallout>
      </GuideSection>
    </div>
  )
}
