'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { PRO_PRICE_MONTHLY } from '@/lib/billing/tier'

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const faqs = [
    {
      question: 'What payment methods do you accept?',
      answer: 'All major credit cards.',
    },
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes. Cancel anytime and keep access through your current billing cycle.',
    },
    {
      question: 'Do you charge transaction fees?',
      answer: 'We do not add platform transaction fees. Standard processor fees still apply.',
    },
    {
      question: 'Is there a setup fee?',
      answer: 'No setup fee.',
    },
    {
      question: 'What happens after my free trial?',
      answer: `After 14 days, your subscription is $${PRO_PRICE_MONTHLY}/month.`,
    },
    {
      question: 'Can I switch plans later?',
      answer: 'Right now there is one plan with full access.',
    },
  ]

  return (
    <div>
      {/* Page Header */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-100 mb-4">
            Simple pricing for serious chefs.
          </h1>
          <p className="text-lg md:text-xl text-stone-300">
            One plan. No hidden fees. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="container mx-auto px-4 pb-16 md:pb-24">
        <div className="max-w-md mx-auto">
          <Card className="border-2 border-brand-500 shadow-xl">
            <CardHeader className="text-center pb-8 pt-8">
              <CardTitle className="text-2xl mb-4">Pro Plan</CardTitle>
              <div className="mb-2">
                <span className="text-5xl font-bold text-stone-100">${PRO_PRICE_MONTHLY}</span>
                <span className="text-stone-300 text-lg">/month</span>
              </div>
              <p className="text-sm text-stone-300">14-day free trial</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-stone-300">Unlimited events &amp; clients</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-stone-300">Full inquiry-to-payment pipeline</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-stone-300">Menus, recipes &amp; food costing</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-stone-300">Invoices, payments &amp; expense tracking</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-stone-300">
                    Client portal for proposals, approvals, and messaging
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-stone-300">Auto-generated documents at key milestones</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-stone-300">
                    Prep lists, shopping lists, and kitchen ops tools
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-stone-300">Calendar, scheduling, and support</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-stone-300">
                    Remy AI for drafting, analysis, and recipe search
                  </span>
                </li>
              </ul>
              <p className="text-xs text-stone-500 text-center mb-2">No credit card required</p>
              <Link
                href="/auth/signup"
                className="block w-full bg-brand-500 text-white text-center px-8 py-3 rounded-md hover:bg-brand-600 transition-colors font-medium"
              >
                Sign up
              </Link>
            </CardContent>
          </Card>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
            AI assists, you decide — nothing happens without your approval.
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-stone-100 mb-4">
              Run service, not spreadsheets.
            </h2>
            <p className="text-lg text-stone-300 mb-8">
              14 days free. No credit card. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto bg-brand-500 text-white px-8 py-3 rounded-md hover:bg-brand-600 transition-colors font-medium text-center"
              >
                Sign up
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto bg-stone-900 text-stone-300 px-8 py-3 rounded-md hover:bg-stone-800 transition-colors font-medium border border-stone-600 text-center"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-stone-800 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-100 mb-8 text-center">
              Common questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="overflow-hidden">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left px-6 py-4 hover:bg-stone-800 transition-colors"
                    aria-expanded={openFaq === index}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-stone-100 pr-8">{faq.question}</h3>
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
                      <p className="text-stone-300">{faq.answer}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
