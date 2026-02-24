'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const faqs = [
    {
      question: 'What payment methods do you accept?',
      answer:
        'We accept all major credit cards. Payment is processed securely and you can cancel your subscription at any time.',
    },
    {
      question: 'Can I cancel anytime?',
      answer:
        'Yes, you can cancel anytime with no penalties. Your subscription will remain active until the end of your current billing period.',
    },
    {
      question: 'Do you charge transaction fees?',
      answer:
        'No additional fees from us. Standard payment processing fees apply (2.9% + 30¢ per transaction).',
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
  ]

  return (
    <main>
      {/* Page Header */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-100 mb-4">
            One plan. Everything included.
          </h1>
          <p className="text-lg md:text-xl text-stone-400">No hidden fees. Cancel anytime.</p>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="container mx-auto px-4 pb-16 md:pb-24">
        <div className="max-w-md mx-auto">
          <Card className="border-2 border-brand-500 shadow-xl">
            <CardHeader className="text-center pb-8 pt-8">
              <div className="mb-4">
                <span className="inline-block px-4 py-1 bg-brand-900 text-brand-400 text-sm font-semibold rounded-full">
                  EVERYTHING YOU NEED
                </span>
              </div>
              <CardTitle className="text-2xl mb-4">Everything You Need</CardTitle>
              <div className="mb-2">
                <span className="text-5xl font-bold text-stone-100">$29</span>
                <span className="text-stone-400 text-lg">/month</span>
              </div>
              <p className="text-sm text-stone-400">14-day free trial included</p>
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
                  <span className="text-stone-300">
                    Inquiry-to-payout pipeline — track every step
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
                    Client portal — proposals, approvals &amp; messaging
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
                  <span className="text-stone-300">
                    Auto-generated documents when milestones hit
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
                  <span className="text-stone-300">
                    Prep lists, shopping lists &amp; kitchen ops
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
                  <span className="text-stone-300">Calendar, scheduling &amp; email support</span>
                </li>
              </ul>
              <p className="text-xs text-stone-500 text-center mb-2">No credit card required</p>
              <Link
                href="/auth/signup"
                className="block w-full bg-brand-9500 text-white text-center px-8 py-3 rounded-md hover:bg-brand-600 transition-colors font-medium"
              >
                Start your 14-day trial
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-stone-100 mb-4">
              Ready to ditch the spreadsheets?
            </h2>
            <p className="text-lg text-stone-400 mb-8">
              Built by a chef who got tired of juggling it all — join the chefs who let ChefFlow
              handle the admin
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto bg-brand-9500 text-white px-8 py-3 rounded-md hover:bg-brand-600 transition-colors font-medium text-center"
              >
                Start your 14-day trial
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto bg-surface text-stone-300 px-8 py-3 rounded-md hover:bg-stone-800 transition-colors font-medium border border-stone-600 text-center"
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
              Frequently Asked Questions
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
                      <p className="text-stone-400">{faq.answer}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
