import type { Metadata } from 'next'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { LAUNCH_MODE, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

type FaqCategory = {
  title: string
  slug: string
  items: { question: string; answer: string }[]
}

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    title: 'For Clients',
    slug: 'for-clients',
    items: [
      {
        question: 'How much does it cost to hire a private chef?',
        answer:
          'Private chef pricing varies by event type, guest count, and menu complexity. Expect $50 to $150+ per person for a private dinner. Weekly meal prep typically runs $200 to $800+ per week depending on household size and meal count. Most chefs offer a free initial consultation to scope the event and provide a quote. On ChefFlow, you can browse chefs, compare profiles, and send inquiries at no cost.',
      },
      {
        question: 'What should I include in my inquiry to a chef?',
        answer:
          'The more detail, the better. Include your event date, guest count, any dietary restrictions or allergies, your budget range, and the occasion (birthday dinner, weekly meal prep, wedding, etc.). Mention the service style you prefer (plated, buffet, family-style) and whether you need the chef to handle grocery shopping. A detailed inquiry helps the chef send an accurate proposal faster.',
      },
      {
        question: 'What is included in a private chef service?',
        answer:
          "Most private chef services include menu planning, grocery shopping, cooking, plating, and kitchen cleanup. Some chefs also offer wine pairing suggestions, table styling, or coordination with servers. Travel fees may apply for events outside the chef's local area. The proposal your chef sends will break down exactly what is included so there are no surprises.",
      },
      {
        question: 'How far in advance should I book a private chef?',
        answer:
          'For dinner parties and small events, 2 to 4 weeks is typical. For weddings and large events, 2 to 6 months in advance is recommended. Holiday season (November through December) books up fast, so plan early. For weekly meal prep, most chefs can start within 1 to 2 weeks.',
      },
      {
        question: 'How do payments work?',
        answer:
          'Payments are processed through Stripe. Most chefs require a 25% to 50% deposit to confirm the booking, with the balance due before or on the day of the event. Your chef sets their own payment terms, and you will see the full breakdown in your proposal before committing.',
      },
      {
        question: 'What if I have allergies or dietary restrictions?',
        answer:
          'Share all dietary needs when you send your inquiry. Chefs on ChefFlow track the FDA Big 9 allergens (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame) plus any custom restrictions. Your dietary profile stays attached to your account so every chef you work with has it.',
      },
    ],
  },
  {
    title: 'Running a Food Business',
    slug: 'running-a-food-business',
    items: [
      {
        question: 'What should my food cost percentage be?',
        answer:
          'For private chefs, target 25% to 35% of your per-person price. Caterers typically aim for 28% to 32%. Food trucks run 28% to 35%. These are guidelines, not rules. What matters is tracking your actual food cost against your target after every event, and adjusting your pricing or menus when the numbers drift. ChefFlow calculates food cost percentage automatically as you build menus and cost recipes.',
      },
      {
        question: 'How do I price my services as a private chef?',
        answer:
          "Stop charging per hour of cooking. Research shows that actual cooking is roughly 40% of a private chef's work. The rest is shopping, driving, client communication, menu planning, and admin. Successful operators charge a flat service fee that covers the full scope of work, not just time at the stove. ChefFlow's costing tools layer food cost, labor, overhead, travel, and margin into a per-person price so you can see exactly what you need to charge to hit your target.",
      },
      {
        question: 'What are yield factors and why do they matter?',
        answer:
          'Yield factor is the percentage of raw ingredient that becomes usable food after trimming, peeling, cooking, or cleaning. A pound of raw shrimp does not give you a pound of peeled shrimp. Common yields: boneless chicken 75%, whole fish 35% to 45%, vegetables 70% to 90%, herbs 50% to 60%. If you ignore yield, you are underpricing every dish. ChefFlow tracks yield factors for 150+ ingredients and applies them automatically when you cost a recipe.',
      },
      {
        question: 'What is the Q-factor in food costing?',
        answer:
          'The Q-factor (sometimes called "incidentals" or "hidden costs") covers the small items that add up: cooking oil, salt, spices, parchment paper, foil, garnishes, disposable gloves. Individually they seem trivial, but across a full event they typically add 5% to 10% on top of your recipe ingredient costs. Most operators forget to include them and wonder why their actual costs exceed their quotes. ChefFlow lets you set a Q-factor percentage that gets applied automatically.',
      },
      {
        question: 'How do I handle last-minute client changes?',
        answer:
          'Set clear terms in your contract. Experienced caterers use escalating surcharges: 30% for changes 7 to 9 days before the event, 100% for changes 3 to 6 days out, and up to 200% for changes within 1 to 2 days. This is standard industry practice, not aggressive pricing. It protects you from scope creep and compensates for rushed procurement. Include your change policy in every proposal.',
      },
      {
        question: 'How do I grow beyond a solo operation?',
        answer:
          'Solo operators typically cap around $80,000 to $100,000 in annual revenue without systems and staff. The first step is not hiring full-time. Use 1099 contractors (day-of sous chefs, servers, bartenders) for individual events. The breakeven for a permanent hire requires roughly $40,000 to $60,000 in additional annual revenue to justify. Build systems first (standardized recipes, costing templates, prep workflows), then add people.',
      },
      {
        question: 'How do I manage seasonality and slow months?',
        answer:
          'May through December generates 60% or more of annual revenue for most private chefs and caterers. January through March is the slowest period. Successful operators bridge the gap by converting event clients into weekly meal prep clients ($200+ per week recurring), pursuing corporate contracts (which are less seasonal), and offering cooking classes or holiday pre-orders during off-peak months. Diversifying your service types smooths the revenue curve.',
      },
      {
        question: 'What is actual vs. theoretical food cost?',
        answer:
          'Theoretical food cost is what your recipes say you should spend. Actual food cost is what you really spent after waste, over-portioning, spoilage, and price changes. The gap between them is your variance. Benchmarks: 0% to 1% variance is excellent, 1% to 3% is acceptable, 3% to 5% is serious, and above 5% needs immediate attention. A 2% excess variance on $300,000 in annual revenue is $6,000 in lost profit. ChefFlow tracks both numbers and shows you the variance after every event.',
      },
      {
        question: 'How much is a single client actually worth?',
        answer:
          'More than you think. A satisfied private chef client is conservatively worth $10,000 to $25,000 over 3 years. One dinner party ($700+) leads to repeat bookings, then weekly meal prep, then referrals. Referred clients spend roughly twice as much as cold leads. A 5% increase in client retention can boost profits by 25% to 95%. Treat every client interaction as a long-term relationship, not a one-off transaction. ChefFlow tracks client lifetime value, repeat rate, and engagement automatically.',
      },
    ],
  },
  {
    title: 'Using ChefFlow',
    slug: 'using-chefflow',
    items: [
      {
        question: 'Who is ChefFlow built for?',
        answer:
          'ChefFlow is built for food operators: private chefs, caterers, meal prep services, food trucks, ghost kitchens, bakeries, and anyone running a food business. Whether you are a solo chef managing 5 clients or a catering team handling 20 events a month, ChefFlow handles inquiries, events, menus, recipes, food costing, finances, staff, and client relationships in one place.',
      },
      {
        question: 'How much does ChefFlow cost?',
        answer:
          'The core platform is free: inquiries, events, menus, recipes, food costing, finances, staff, and client management. No commission, no hidden fees, no cut of your bookings. Paid plans unlock automation, AI intelligence, and scale features for operators who want to grow faster.',
      },
      {
        question: 'Can I start with a small operation and grow later?',
        answer:
          'Yes. Most operators start with one workflow (usually the inquiry-to-event pipeline), then expand into menu costing, recipe management, and financial tracking as their volume increases. There is no minimum size. ChefFlow works whether you do 2 events a month or 50.',
      },
      {
        question: 'Can I migrate from spreadsheets or a generic CRM?',
        answer:
          'Yes. Migrate active opportunities and upcoming events first, then retire your duplicate trackers after your first clean cycle. ChefFlow replaces the patchwork of spreadsheets, text threads, notes apps, and generic tools that most operators run on (42% of food operators still use pen-and-paper or spreadsheets for their core business operations).',
      },
      {
        question: 'What does the inquiry-to-event pipeline look like?',
        answer:
          'A client sends an inquiry (from your profile, your website embed, or a direct link). You review it, respond, build a menu, cost it, send a proposal with payment terms, collect a deposit, prep, execute, invoice, and reconcile. ChefFlow tracks the entire lifecycle across 8 stages (draft, proposed, accepted, paid, confirmed, in progress, completed, cancelled) so nothing falls through the cracks.',
      },
      {
        question: 'How does food costing work in ChefFlow?',
        answer:
          'Add your recipes with ingredients and quantities. ChefFlow resolves prices through a 10-tier system (your own receipts, live API quotes, store prices, regional averages, government data, and more). It applies yield factors, Q-factor, and portion scaling automatically. When you build a menu, you see your blended food cost percentage in real time. After the event, you reconcile actual spend against your quote.',
      },
      {
        question: 'Is my data private?',
        answer:
          "Yes. Client data, financials, recipes, and conversations are processed by ChefFlow's own private AI infrastructure. We do not store conversation content on our servers. Your recipes are your intellectual property. We never use your data to train AI models or share it with third parties. The Trust Center has the full breakdown.",
      },
      {
        question: 'How does Remy compare to other AI tools?',
        answer:
          "Remy runs on ChefFlow's own private AI infrastructure instead of sending your data to a third-party cloud service. That means your client names, recipes, financials, and conversations never leave ChefFlow. Remy is fast, private, and purpose-built for chef operations. Your business data is not ours to share.",
      },
      {
        question: 'How long does setup take?',
        answer:
          'Most chefs have a usable baseline in under an hour. Sign up, fill out your profile, add a few recipes, and you are ready to receive inquiries. The depth comes over time as you add more recipes, cost your menus, and build your client history.',
      },
      {
        question: 'Where can I review security and trust information?',
        answer:
          'The Trust Center summarizes security baseline, data handling, directory standards, and support expectations in one place.',
      },
    ],
  },
]

// Flatten for schema.org
const ALL_FAQ_ITEMS = FAQ_CATEGORIES.flatMap((cat) => cat.items)

export const metadata: Metadata = {
  title: 'ChefFlow FAQ | Private Chef Business Questions Answered',
  description:
    'Answers to common questions about food costing, pricing, hiring a private chef, running a food business, and using ChefFlow to manage your operation.',
  openGraph: {
    title: 'ChefFlow FAQ',
    description:
      'Practical answers for private chef clients and food operators on pricing, food costing, business growth, and the ChefFlow platform.',
    url: `${BASE_URL}/faq`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/faq`,
  },
}

export default function FaqPage() {
  const isBeta = LAUNCH_MODE === 'beta'
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ALL_FAQ_ITEMS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <div>
      <PublicPageView pageName="faq" properties={{ section: 'public_growth' }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px]" />
        <div className="relative mx-auto w-full max-w-5xl px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
          <p className="inline-flex rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            FAQ
          </p>
          <h1 className="mt-5 text-4xl font-display tracking-tight text-stone-100 md:text-6xl">
            Questions from chefs, clients, and operators.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-stone-300 md:text-lg">
            Real answers on hiring a private chef, pricing your services, food costing, growing your
            business, and using ChefFlow.
          </p>
        </div>
      </section>

      {/* Jump links */}
      <nav className="mx-auto w-full max-w-4xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2">
          {FAQ_CATEGORIES.map((cat) => (
            <a
              key={cat.slug}
              href={`#${cat.slug}`}
              className="rounded-lg border border-stone-700 bg-stone-900/60 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:bg-stone-800 hover:text-stone-100"
            >
              {cat.title}
            </a>
          ))}
        </div>
      </nav>

      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <div className="space-y-10">
          {FAQ_CATEGORIES.map((category) => (
            <div key={category.slug} id={category.slug}>
              <h2 className="mb-4 text-lg font-display font-semibold text-stone-100">
                {category.title}
              </h2>
              <div className="space-y-3">
                {category.items.map((faq) => (
                  <details
                    key={faq.question}
                    className="rounded-xl border border-stone-700 bg-stone-900/80 p-4"
                  >
                    <summary className="cursor-pointer list-none pr-4 text-sm font-semibold text-stone-100">
                      {faq.question}
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-stone-300">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="mx-auto w-full max-w-5xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
          <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Ready to run your operation on one platform?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-300">
            Start with one workflow and see the difference when everything connects.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href="/trust"
              analyticsName="faq_trust_link"
              analyticsProps={{ section: 'faq_bottom' }}
              className="inline-flex items-center rounded-lg border border-stone-600 bg-stone-900 px-7 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              Review trust center
            </TrackedLink>
            <TrackedLink
              href={buildMarketingSignupHref({
                sourcePage: 'faq',
                sourceCta: 'bottom_primary',
              })}
              analyticsName="faq_primary_cta"
              analyticsProps={{ launch_mode: LAUNCH_MODE, section: 'faq_bottom' }}
              className="inline-flex items-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {isBeta ? 'Join beta waitlist' : PRIMARY_SIGNUP_LABEL}
            </TrackedLink>
          </div>
        </div>
      </section>
    </div>
  )
}
