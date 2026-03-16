'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'

const FAQS = [
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards via Stripe. Payment is processed securely and you can cancel your subscription at any time.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes, you can cancel anytime with no penalties. Your subscription will remain active until the end of your current billing period.',
  },
  {
    question: 'Do you charge transaction fees?',
    answer:
      'No additional fees from us. Standard Stripe payment processing rates apply (2.9% + 30\u00a2 per transaction for US cards).',
  },
  {
    question: 'Is there a setup fee?',
    answer:
      'No setup fees. Start free for 14 days, and only pay if you decide to continue after your trial ends.',
  },
  {
    question: 'What happens after my free trial?',
    answer:
      "After your 14-day free trial, you'll be charged $29/month. You can cancel anytime before the trial ends with no charge.",
  },
  {
    question: 'Can I switch plans later?',
    answer:
      "Currently we offer one comprehensive plan that includes everything you need. As we add more features, we'll introduce additional plans with clear upgrade paths.",
  },
] as const

export default function PricingFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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
            {FAQS.map((faq, index) => (
              <Card key={index} className="overflow-hidden">
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
