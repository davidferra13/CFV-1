'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { LAUNCH_MODE } from '@/lib/marketing/launch-mode'

const PUBLIC_FAQS = [
  {
    question: 'Is ChefFlow really free?',
    answer:
      'Yes. Every feature is included at no cost. No credit card, no trial period, no locked features.',
  },
  {
    question: 'How does ChefFlow make money?',
    answer:
      'We offer an optional voluntary supporter contribution for chefs who want to help fund ongoing development. It is entirely optional and does not unlock any additional features.',
  },
  {
    question: 'Do you charge transaction fees?',
    answer:
      'No additional platform fees. Standard Stripe payment processing rates apply to client payments.',
  },
  {
    question: 'Will features ever become paid?',
    answer:
      'We have no plans to lock existing features behind a paywall. Our goal is to keep the full platform free for every chef.',
  },
  {
    question: 'What if I need help migrating from another tool?',
    answer:
      'Contact us about the Scale package for hands-on implementation support, migration planning, and team onboarding.',
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
      'ChefFlow is free for all chefs. We may introduce optional paid services in the future, but the core platform stays free.',
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
