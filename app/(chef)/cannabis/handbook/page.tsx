import {
  CannabisPortalHeader,
  CannabisPageWrapper,
} from '@/components/cannabis/cannabis-portal-header'

type HandbookSection = {
  title: string
  items: string[]
  exclusions?: string[]
}

const sections: HandbookSection[] = [
  {
    title: '1. Philosophy of Service',
    items: [
      'Voluntary participation',
      'Predictable pacing',
      'Consistency over intensity',
      'Calm communication tone',
      'Never surprise-dose',
    ],
  },
  {
    title: '2. Extract Fundamentals',
    items: [
      'Types (distillate, live resin, rosin, tincture)',
      'Label mg strength',
      'Calculating mg per portion',
      'Storage basics',
      'Heat stability considerations',
    ],
    exclusions: ['No chemistry deep dives.', 'No medical claims.'],
  },
  {
    title: '3. Portioning Workflow',
    items: [
      'Confirm label potency',
      'Calculate total mg available',
      'Decide mg per guest per course',
      'Portion before service begins',
      'Document portioning in Control Packet',
    ],
  },
  {
    title: '4. Infusion Strategies',
    items: [
      'Direct plating method',
      'Oil dilution method',
      'Micro-application method',
      'Course progression logic (light -> moderate)',
      'Avoid stacking unintentionally',
    ],
  },
  {
    title: '5. Guest Communication Scripts',
    items: [
      'How to explain dosing calmly',
      'How to handle opt-outs',
      'How to address uncertainty',
      'How to pause service if needed',
    ],
    exclusions: ['No impairment analysis.', 'No incident escalation system.'],
  },
  {
    title: '6. Common Mistakes',
    items: [
      'Estimating instead of calculating',
      'Changing dose mid-course without documenting',
      'Mixing alcohol aggressively',
      'Not labeling syringes',
      'Forgetting final reconciliation',
    ],
  },
  {
    title: '7. Post-Event Calibration',
    items: [
      'What felt smooth',
      'What felt heavy',
      'Dose adjustments for similar future events',
      'Guest feedback interpretation',
    ],
  },
]

export default function CannabisHandbookDraftPage() {
  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <CannabisPortalHeader
          title="Cannabis Dinner Handbook (Draft)"
          subtitle="Structured outline only"
          backHref="/cannabis"
          backLabel="Cannabis Hub"
        />

        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: 'rgba(74, 124, 78, 0.12)',
            border: '1px solid rgba(106, 170, 110, 0.3)',
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1 text-[#8bc34a]">
            Internal Reminder
          </p>
          <p className="text-sm text-[#d2e8d4]">Cannabis Handbook content not yet finalized.</p>
        </div>

        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: '#0f1a0f',
            border: '1px solid rgba(74, 124, 78, 0.2)',
          }}
        >
          <p className="text-sm font-semibold text-[#e8f5e9] mb-2">
            Draft — Content To Be Expanded Later
          </p>
          <p className="text-sm text-[#6aaa6e]">
            Internal-only draft reference. No legal framing. No medical framing. No compliance
            expansion.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 text-xs font-medium">
          {['Status: Draft', 'Internal-only', 'Not guest visible', 'Optional reference'].map(
            (item) => (
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
            )
          )}
        </div>

        <div className="space-y-4 mb-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-xl p-5"
              style={{
                background: 'linear-gradient(135deg, #0a130a 0%, #0f1a0f 100%)',
                border: '1px solid rgba(74, 124, 78, 0.15)',
              }}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8bc34a] mb-3">
                {section.title}
              </h2>
              <ul className="space-y-1.5 text-sm text-[#d2e8d4]">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 text-[#6aaa6e]">-</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {section.exclusions && (
                <div
                  className="mt-3 rounded-lg p-3 text-xs"
                  style={{
                    background: 'rgba(180, 100, 30, 0.12)',
                    border: '1px solid rgba(180, 100, 30, 0.35)',
                    color: '#e6c098',
                  }}
                >
                  {section.exclusions.join(' ')}
                </div>
              )}
            </section>
          ))}
        </div>

        <section
          className="rounded-xl p-5"
          style={{
            background: '#0f1a0f',
            border: '1px solid rgba(74, 124, 78, 0.2)',
          }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8bc34a] mb-3">
            Implementation Instruction
          </h2>
          <ul className="space-y-1.5 text-sm text-[#d2e8d4]">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[#6aaa6e]">-</span>
              <span>Must not affect Cannabis Portal logic.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[#6aaa6e]">-</span>
              <span>Must not introduce new compliance requirements.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[#6aaa6e]">-</span>
              <span>Must not be required reading.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[#6aaa6e]">-</span>
              <span>Must not block event workflow.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[#6aaa6e]">-</span>
              <span>Must remain optional internal reference.</span>
            </li>
          </ul>
        </section>
      </div>
    </CannabisPageWrapper>
  )
}
