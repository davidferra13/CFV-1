'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { LAUNCH_MODE } from '@/lib/marketing/launch-mode'

const PUBLIC_FAQS = [
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards via Stripe. Payment is processed securely and you can cancel your subscription at any time.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. You can cancel anytime with no penalties, and your subscription remains active until the end of the current billing period.',
  },
  {
    question: 'Do you charge transaction fees?',
    answer:
      'No additional platform fees. Standard Stripe payment processing rates apply to client payments.',
  },
  {
    question: 'Is there a setup fee?',
    answer:
      'No setup fees. Start with the trial and only pay if you decide to continue after the trial ends.',
  },
  {
    question: 'What happens after my free trial?',
    answer:
      'After the trial ends, the plan converts to the monthly subscription unless you cancel first.',
  },
  {
    question: 'Can I switch plans later?',
    answer:
      'Yes. Additional plan options can be introduced later without requiring a full account migration.',
  },
] as const

const BETA_FAQS = [
  {
    question: 'How does beta onboarding work?',
    answer:
      'Request early access and we will review fit, then onboard you directly with guided setup and feedback collection.',
  },
  {
    question: 'Is pricing finalized?',
    answer:
      'No. Beta pricing is intentionally not locked yet. Early operators are admitted first so onboarding and retention can be validated before broad self-serve release.',
  },
  {
    question: 'Will beta participants get support?',
    answer:
      'Yes. Beta accounts receive direct support while core workflows, reporting, and launch readiness are hardened.',
  },
  {
    question: 'Can I still use Stripe?',
    answer:
      'Yes. Payment workflows still run through Stripe, but availability may depend on the current beta rollout scope.',
  },
] as const

export default function PricingFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const faqs = LAUNCH_MODE === 'public' ? PUBLIC_FAQS : BETA_FAQS

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  return (
    <section className="bg-stone-50 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={faq.question} className="overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full text-left px-6 py-4 hover:bg-stone-50 transition-colors"
                  aria-expanded={openFaq === index}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-stone-900 pr-8">{faq.question}</h3>
                    <svg
                      className={`w-5 h-5 text-stone-500 flex-shrink-0 transition-transform ${
                        openFaq === index ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4">
                    <p className="text-stone-600">{faq.answer}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
