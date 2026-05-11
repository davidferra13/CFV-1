'use client'

import { useState } from 'react'
import { ChevronDown } from '@/components/ui/icons'

interface FAQItem {
  question: string
  answer: string
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I book an event?',
    answer:
      "Start by sending an inquiry through your chef's booking page or messaging them directly. They will follow up with availability, discuss your vision, then send you a quote. Once you approve the quote and pay the deposit, your event is confirmed.",
  },
  {
    question: 'Can I change my menu after confirming?',
    answer:
      'Yes! Message your chef through the chat page and let them know what changes you would like. They will update the menu and let you know if there are any price adjustments.',
  },
  {
    question: 'How does payment splitting work?',
    answer:
      'When your chef sends a payment request, you can choose to split it among multiple guests. Each person receives their own payment link and pays their share directly. You can track who has paid on your event page.',
  },
  {
    question: 'What if I have dietary restrictions?',
    answer:
      'Head to your Food Preferences page to add allergies, dietary restrictions, dislikes, and cuisine preferences. Your chef sees these automatically when planning menus for your events.',
  },
  {
    question: 'How do I cancel or reschedule?',
    answer:
      'Contact your chef via the Messages page as soon as possible. Cancellation policies vary by chef, so check your contract or quote for details on fees and timelines.',
  },
  {
    question: 'Can I see recipes from past dinners?',
    answer:
      'Yes! Visit your Recipes page to browse dishes from your past events. Your chef can share recipes, tasting notes, and pairing suggestions there.',
  },
  {
    question: 'How do referrals work?',
    answer:
      'Visit your Referrals page to get your unique referral link. When someone books their first event through your link, you earn referral rewards that your chef defines (often a discount on your next event).',
  },
]

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, idx) => {
        const isOpen = openIndex === idx
        return (
          <div
            key={idx}
            className="rounded-lg border border-stone-800 bg-stone-900 overflow-hidden"
          >
            <button
              type="button"
              className="w-full flex items-center justify-between px-5 py-4 text-left text-stone-100 hover:bg-stone-800/50 transition-colors"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              aria-expanded={isOpen}
            >
              <span className="font-medium text-sm">{item.question}</span>
              <ChevronDown
                className={`w-4 h-4 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-4 text-sm text-stone-400 leading-relaxed">{item.answer}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
