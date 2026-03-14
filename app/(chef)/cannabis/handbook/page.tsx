import {
  CannabisPortalHeader,
  CannabisPageWrapper,
} from '@/components/cannabis/cannabis-portal-header'

type HandbookSection = {
  title: string
  intro: string
  items: { heading: string; detail: string }[]
  exclusions?: string[]
  tip?: string
}

const sections: HandbookSection[] = [
  {
    title: '1. Philosophy of Service',
    intro:
      'Cannabis dining is hospitality first. The extract is a tool in your kitchen, not the centerpiece of the experience. Every decision you make should prioritize guest comfort, predictability, and trust.',
    items: [
      {
        heading: 'Voluntary participation',
        detail:
          'Every guest chooses whether to participate in cannabis courses. No assumptions, no pressure. Offer the non-infused version of every course alongside the infused one. Frame it as a choice, never a challenge.',
      },
      {
        heading: 'Predictable pacing',
        detail:
          'Space infused courses 30-45 minutes apart minimum. Onset varies by person, but you control the serving cadence. Faster pacing leads to stacking (cumulative effects hitting before guests realize). Slower is always safer.',
      },
      {
        heading: 'Consistency over intensity',
        detail:
          'A 3mg dose served perfectly across 5 courses is a better experience than a single 15mg course. Low, even dosing lets guests enjoy the food and the conversation. The goal is elevation, not impairment.',
      },
      {
        heading: 'Calm communication tone',
        detail:
          'When explaining dosing, use the same tone you would for describing a wine pairing. Matter-of-fact, informative, no drama. "This course has 3 milligrams of THC applied as an oil finish" is enough. No performance.',
      },
      {
        heading: 'Never surprise-dose',
        detail:
          'Every infused element must be announced before it reaches the table. If a guest did not hear you explain it, they did not consent to it. This is non-negotiable.',
      },
    ],
  },
  {
    title: '2. Extract Fundamentals',
    intro:
      'You do not need a chemistry degree. You need to understand what you are working with well enough to portion it accurately and store it safely.',
    items: [
      {
        heading: 'Types you will encounter',
        detail:
          'Distillate (clear, nearly flavorless, high potency, easiest to work with). Live resin (full-spectrum, more flavor, variable potency). Rosin (solventless, artisanal, potency varies by batch). Tincture (alcohol or oil-based, pre-diluted, easier to dose but adds liquid volume).',
      },
      {
        heading: 'Reading label potency',
        detail:
          'Labels show mg per gram or mg per ml. A 1g syringe labeled "850mg THC" means 850mg total. If you use 0.1g of that syringe, you are applying 85mg. Always confirm the math before service.',
      },
      {
        heading: 'Calculating mg per portion',
        detail:
          'Total mg in syringe divided by number of portions equals mg per portion. Example: 850mg syringe, 8 guests, 5 courses = 850 / (8 x 5) = 21.25mg per application. That is too high for most guests. Adjust down to 2-5mg per course per guest for a comfortable dinner.',
      },
      {
        heading: 'Storage',
        detail:
          'Keep extracts in a cool, dark place. Syringes store well at room temperature for short periods. For longer storage, refrigerate (bring to room temp before use so the oil flows). Label every container with strain, potency, and date opened.',
      },
      {
        heading: 'Heat stability',
        detail:
          'THC degrades above 315F (157C). Apply extracts as a finish, not as a cooking ingredient. Drizzle on plated food, fold into room-temp sauces, or apply to garnishes. Never put extract into a hot pan or oven.',
      },
    ],
    exclusions: [
      'No chemistry deep dives.',
      'No medical claims about specific strains or effects.',
    ],
  },
  {
    title: '3. Portioning Workflow',
    intro:
      'Portioning happens before service starts. Never portion during service. The workflow below matches the Control Packet system built into this portal.',
    items: [
      {
        heading: 'Step 1: Confirm label potency',
        detail:
          'Read the syringe label. Confirm total mg. If the label is missing or unclear, do not use that syringe. Contact your supplier for a replacement with proper labeling.',
      },
      {
        heading: 'Step 2: Calculate total mg available',
        detail:
          'Multiply syringe count by mg per syringe. Example: 2 syringes at 850mg each = 1,700mg total. This is your working inventory for the event.',
      },
      {
        heading: 'Step 3: Decide mg per guest per course',
        detail:
          'For a standard dinner: 2-5mg per guest per course. For experienced groups (confirmed during intake): up to 8-10mg per course. First-time groups: start at 2mg. You can always offer more. You cannot take it back.',
      },
      {
        heading: 'Step 4: Portion before service begins',
        detail:
          'Use labeled syringes or small containers. Each portion should be pre-measured and labeled with the course number and mg amount. Line them up in service order. This eliminates guesswork during plating.',
      },
      {
        heading: 'Step 5: Document in Control Packet',
        detail:
          'Record syringe label strength, total mg, planned mg per course per guest, and actual mg applied. The Control Packet in this portal captures all of this. Fill it in before you start plating.',
      },
    ],
    tip: 'Pre-portioning into small labeled cups or marked syringes is the single most important step. It takes 10 minutes and prevents every common dosing error.',
  },
  {
    title: '4. Infusion Strategies',
    intro:
      'There are three primary application methods. Choose based on the dish, the potency you need, and the number of guests.',
    items: [
      {
        heading: 'Direct plating method',
        detail:
          'Apply a measured amount of extract directly onto the plated dish using a syringe or dropper. Best for: sauces, oils, or finishing applications where the extract blends into the dish visually and texturally. Most precise method.',
      },
      {
        heading: 'Oil dilution method',
        detail:
          'Mix extract into a carrier oil (olive, coconut, avocado) at a known ratio. Example: 100mg extract into 10ml olive oil = 10mg/ml. Then dose by the ml. Best for: larger batches, dressings, or when you need consistent dosing across many portions.',
      },
      {
        heading: 'Micro-application method',
        detail:
          'Use a precision syringe (1ml or smaller) to apply tiny amounts directly. Best for: low-dose courses (2-3mg), delicate garnishes, or when the dish cannot absorb a full oil application. Requires steady hands and good lighting.',
      },
      {
        heading: 'Course progression logic',
        detail:
          'Start with the lowest dose in the first course. Increase slightly in courses 2-3 if the group is comfortable. Ease back in courses 4-5. Think of it like a bell curve, not a staircase. The heaviest dose should be mid-meal when guests are seated, fed, and relaxed.',
      },
      {
        heading: 'Avoid unintentional stacking',
        detail:
          'If courses come out faster than planned, the previous dose has not peaked yet. This leads to stacking (compound effects). If you are running ahead of schedule, slow the service. Insert a palate cleanser or a non-infused intermezzo. Never rush cannabis courses.',
      },
    ],
  },
  {
    title: '5. Guest Communication',
    intro:
      'How you talk about cannabis at the table sets the entire tone. Be direct, calm, and informative. Guests take their cues from you.',
    items: [
      {
        heading: 'Explaining dosing',
        detail:
          '"This course includes 3 milligrams of THC, applied as an oil finish to the dish. If you prefer the non-infused version, I have one ready for you." That is the entire script. No elaborate explanations needed.',
      },
      {
        heading: 'Handling opt-outs',
        detail:
          '"Absolutely, here is the same dish without the infusion." No follow-up questions, no visible reaction. Treat it exactly like a dietary accommodation. A guest who opts out of one course may opt back in for the next. Keep their non-infused plate available for every course.',
      },
      {
        heading: 'Addressing uncertainty',
        detail:
          'If a guest asks "how will this make me feel?" be honest: "At this dose, most people feel relaxed and present. It is designed to complement the food, not overwhelm it. If at any point you would like to skip a course, just let me know." Never promise a specific experience.',
      },
      {
        heading: 'Pausing service',
        detail:
          'If a guest looks uncomfortable, check in quietly and privately. "How are you feeling? Would you like some water or a break before the next course?" If they want to stop, serve the rest of their meal non-infused. Document the pause in your Control Packet notes.',
      },
    ],
    exclusions: ['No impairment analysis.', 'No clinical language.'],
  },
  {
    title: '6. Common Mistakes',
    intro:
      'These are the errors that show up repeatedly in cannabis dining. Every one of them is preventable with the workflows above.',
    items: [
      {
        heading: 'Estimating instead of calculating',
        detail:
          '"About half a syringe" is not a measurement. Calculate the exact mg. Use the math. Every single time. The difference between 5mg and 50mg is the difference between a pleasant dinner and a bad experience.',
      },
      {
        heading: 'Changing dose mid-course without documenting',
        detail:
          'If you decide to adjust dosing during service (a guest asks for more, you realize you portioned too high), update the Control Packet immediately. Undocumented changes make reconciliation impossible and break the audit trail.',
      },
      {
        heading: 'Mixing alcohol aggressively',
        detail:
          'Cannabis and alcohol amplify each other. If the event includes wine pairings or cocktails, dose lower (1-3mg per course instead of 3-5mg). Communicate this to the host during planning, not at the table.',
      },
      {
        heading: 'Not labeling syringes',
        detail:
          'Multiple syringes on a station look identical. Label each with strain, potency, and date. Use a permanent marker or medical tape. An unlabeled syringe is an unknown syringe, and unknown syringes do not go on food.',
      },
      {
        heading: 'Skipping final reconciliation',
        detail:
          'After service, account for every mg. Starting inventory minus used amount should equal remaining inventory. If the numbers do not add up, document the discrepancy. The Control Packet reconciliation step exists for this reason.',
      },
    ],
  },
  {
    title: '7. Post-Event Calibration',
    intro:
      'After every cannabis event, spend 10 minutes reviewing what worked and what did not. This is how you get better at dosing over time.',
    items: [
      {
        heading: 'What felt smooth',
        detail:
          'Which courses landed well? Where did the pacing feel right? Which dosing level seemed comfortable for the group? Write these down while they are fresh. These become your baseline for similar future events.',
      },
      {
        heading: 'What felt heavy',
        detail:
          'Did any guest seem overwhelmed? Were courses coming out too fast? Did the cumulative dose feel higher than intended? If yes, note the specific course and dose level so you can adjust next time.',
      },
      {
        heading: 'Dose adjustments for future events',
        detail:
          'Use the After Action Review (AAR) system in ChefFlow to record lessons. Tag the event with the dosing profile you used. Over time, you will build a personal reference library of what works for different group sizes and experience levels.',
      },
      {
        heading: 'Guest feedback interpretation',
        detail:
          'Guests will rarely give you direct feedback about dosing. Read the room instead. Were people laughing and engaged through dessert? That is success. Were people quiet and withdrawn by course 4? That is too much. Calibrate based on what you observe, not what people say.',
      },
    ],
    tip: 'Keep a simple log: event date, guest count, experience level, mg per course, and one sentence about how it went. After 10 events, you will have a personal dosing guide that no textbook can match.',
  },
]

export default function CannabisHandbookPage() {
  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <CannabisPortalHeader
          title="Cannabis Dinner Handbook"
          subtitle="Operational reference for cannabis dining service"
          backHref="/cannabis"
          backLabel="Cannabis Hub"
        />

        {/* Purpose statement */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{
            background: 'linear-gradient(135deg, #0a130a 0%, #0f1a0f 100%)',
            border: '1px solid rgba(74, 124, 78, 0.15)',
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: '#6aaa6e' }}>
            This handbook covers the operational knowledge you need to run a cannabis dinner safely
            and consistently. It is an internal reference, not a compliance document and not a
            medical guide. Use it alongside the Control Packet system for structured execution.
          </p>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2 mb-6 text-xs font-medium">
          {[
            'Internal reference',
            'Not guest-visible',
            'Optional reading',
            'Pairs with Control Packets',
          ].map((item) => (
            <span
              key={item}
              className="px-2.5 py-1 rounded-full"
              style={{
                background: 'rgba(74, 124, 78, 0.16)',
                border: '1px solid rgba(106, 170, 110, 0.3)',
                color: '#b9ddb9',
              }}
            >
              {item}
            </span>
          ))}
        </div>

        {/* Table of Contents */}
        <nav
          className="rounded-xl p-5 mb-6"
          style={{
            background: '#0f1a0f',
            border: '1px solid rgba(74, 124, 78, 0.2)',
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8bc34a] mb-3">
            Sections
          </p>
          <ul className="space-y-1.5">
            {sections.map((section) => (
              <li key={section.title}>
                <a
                  href={`#${section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  className="text-sm text-[#6aaa6e] hover:text-[#8bc34a] transition-colors"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sections */}
        <div className="space-y-6 mb-6">
          {sections.map((section) => (
            <section
              key={section.title}
              id={section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
              className="rounded-xl p-5"
              style={{
                background: 'linear-gradient(135deg, #0a130a 0%, #0f1a0f 100%)',
                border: '1px solid rgba(74, 124, 78, 0.15)',
              }}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8bc34a] mb-3">
                {section.title}
              </h2>

              <p className="text-sm text-[#d2e8d4] mb-4 leading-relaxed">{section.intro}</p>

              <div className="space-y-4">
                {section.items.map((item) => (
                  <div key={item.heading}>
                    <h3 className="text-sm font-semibold text-[#e8f5e9] mb-1">{item.heading}</h3>
                    <p className="text-sm text-[#a8cfa8] leading-relaxed">{item.detail}</p>
                  </div>
                ))}
              </div>

              {section.tip && (
                <div
                  className="mt-4 rounded-lg p-3"
                  style={{
                    background: 'rgba(45, 122, 90, 0.15)',
                    border: '1px solid rgba(45, 122, 90, 0.3)',
                  }}
                >
                  <p className="text-xs font-semibold text-[#8bc34a] mb-1">Tip</p>
                  <p className="text-sm text-[#d2e8d4]">{section.tip}</p>
                </div>
              )}

              {section.exclusions && (
                <div
                  className="mt-4 rounded-lg p-3 text-xs"
                  style={{
                    background: 'rgba(180, 100, 30, 0.12)',
                    border: '1px solid rgba(180, 100, 30, 0.35)',
                    color: '#e6c098',
                  }}
                >
                  <span className="font-semibold">Out of scope: </span>
                  {section.exclusions.join(' ')}
                </div>
              )}
            </section>
          ))}
        </div>

        {/* About this document */}
        <section
          className="rounded-xl p-5"
          style={{
            background: '#0f1a0f',
            border: '1px solid rgba(74, 124, 78, 0.2)',
          }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8bc34a] mb-3">
            About This Document
          </h2>
          <ul className="space-y-1.5 text-sm text-[#d2e8d4]">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[#6aaa6e]">-</span>
              <span>This is an operational reference, not a legal or compliance document.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[#6aaa6e]">-</span>
              <span>It does not replace state-specific regulations or licensing requirements.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[#6aaa6e]">-</span>
              <span>Reading it is optional. It does not gate any portal features.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[#6aaa6e]">-</span>
              <span>
                Written from direct experience running cannabis dinners over 10+ years in Maine.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[#6aaa6e]">-</span>
              <span>
                For the full story behind this portal, see the{' '}
                <a
                  href="/cannabis/about"
                  className="underline underline-offset-2 text-[#8bc34a] hover:text-[#a4d65a]"
                >
                  About page
                </a>
                .
              </span>
            </li>
          </ul>
        </section>
      </div>
    </CannabisPageWrapper>
  )
}
