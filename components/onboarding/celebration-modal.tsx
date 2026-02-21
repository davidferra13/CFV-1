'use client'

// CelebrationModal — Milestone celebration overlay.
// Fires on key achievements: first client, first event completed, first payment.
// Uses localStorage to track "already celebrated" state (never shows twice).
// Pure client-side, no server interaction.

import { useState, useEffect } from 'react'

export type CelebrationMilestone =
  | 'first_client'
  | 'first_event_completed'
  | 'first_payment_received'
  | 'first_inquiry'
  | 'first_quote_sent'

interface Props {
  milestone: CelebrationMilestone
  /** If false, modal won't show (caller can gate on data conditions) */
  shouldCelebrate: boolean
}

const MILESTONE_CONTENT: Record<CelebrationMilestone, { emoji: string; title: string; message: string }> = {
  first_client: {
    emoji: '🎉',
    title: 'Your first client!',
    message: 'You just added your first client. Build that relationship — it\'s the foundation of everything.',
  },
  first_event_completed: {
    emoji: '✅',
    title: 'First event complete!',
    message: 'You did it — your first event is in the books. The ledger is updated, the timeline is locked. On to the next one.',
  },
  first_payment_received: {
    emoji: '💰',
    title: 'First payment in!',
    message: 'Your first payment has landed. This is what all the planning is for.',
  },
  first_inquiry: {
    emoji: '📬',
    title: 'First inquiry logged!',
    message: 'A lead is in the system. Work your pipeline — every client starts here.',
  },
  first_quote_sent: {
    emoji: '📋',
    title: 'First quote sent!',
    message: 'Your first proposal is in a client\'s hands. Follow up in 48 hours if you hear nothing.',
  },
}

const STORAGE_KEY_PREFIX = 'chefflow_celebrated_'

export function CelebrationModal({ milestone, shouldCelebrate }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!shouldCelebrate) return

    const key = `${STORAGE_KEY_PREFIX}${milestone}`
    try {
      if (localStorage.getItem(key)) return // already celebrated
      localStorage.setItem(key, '1')
    } catch {
      // localStorage unavailable — still show once this session
    }

    // Small delay so the page data has settled before the modal pops
    const timer = setTimeout(() => setVisible(true), 800)
    return () => clearTimeout(timer)
  }, [shouldCelebrate, milestone])

  if (!visible) return null

  const content = MILESTONE_CONTENT[milestone]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-in fade-in duration-200"
      onClick={() => setVisible(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-title"
      >
        <div className="text-6xl" aria-hidden="true">{content.emoji}</div>
        <h2 id="celebration-title" className="text-2xl font-bold text-stone-900">
          {content.title}
        </h2>
        <p className="text-stone-600 text-sm leading-relaxed">{content.message}</p>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="mt-2 w-full py-2.5 px-4 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          Let&apos;s go →
        </button>
      </div>
    </div>
  )
}
