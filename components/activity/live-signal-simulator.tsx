'use client'

import { useMemo, useState } from 'react'
import {
  getLivePrivacySignalLabel,
  getLiveSignalConfidenceCopy,
  getLiveSignalPolicy,
  getPrivacyAwareFollowUpCopy,
} from '@/lib/activity/live-signal-policy'
import type { ActivityEventType } from '@/lib/activity/types'

type SimulatorCase = {
  id: string
  label: string
  eventType: ActivityEventType
  privateMode: boolean
  description: string
}

const CASES: SimulatorCase[] = [
  {
    id: 'proposal-visible',
    label: 'Proposal opened, visible',
    eventType: 'proposal_viewed',
    privateMode: false,
    description: 'A client reviews a proposal while sharing proposal signals.',
  },
  {
    id: 'proposal-private',
    label: 'Proposal opened, private',
    eventType: 'proposal_viewed',
    privateMode: true,
    description: 'A client reviews a proposal with private viewing enabled.',
  },
  {
    id: 'payment-visible',
    label: 'Payment page opened',
    eventType: 'payment_page_visited',
    privateMode: false,
    description: 'A client opens a payment page while sharing high-intent signals.',
  },
  {
    id: 'chat-visible',
    label: 'Chat typing, visible',
    eventType: 'chat_opened',
    privateMode: false,
    description: 'A client opens chat and allows message read or typing signals.',
  },
  {
    id: 'chat-private',
    label: 'Chat typing, private',
    eventType: 'chat_opened',
    privateMode: true,
    description: 'A client opens chat with read and typing signals hidden.',
  },
  {
    id: 'presence-expired',
    label: 'Presence expired',
    eventType: 'session_heartbeat',
    privateMode: true,
    description: 'Presence is unavailable after timeout or private browsing.',
  },
]

function buildChefFeedCopy(testCase: SimulatorCase): string {
  if (testCase.privateMode) {
    return 'No live signal available. The client may not be active, or they may be browsing privately.'
  }

  return getLiveSignalPolicy(testCase.eventType).activityLabel
}

function buildClientReceiptCopy(testCase: SimulatorCase): string {
  if (testCase.privateMode) {
    return `Private: ${getLivePrivacySignalLabel(testCase.eventType)}`
  }

  return `Shared: ${getLivePrivacySignalLabel(testCase.eventType)}`
}

export function LiveSignalSimulator() {
  const [selectedId, setSelectedId] = useState(CASES[0]?.id ?? '')
  const selected = CASES.find((testCase) => testCase.id === selectedId) ?? CASES[0]

  const result = useMemo(() => {
    return {
      chefFeed: buildChefFeedCopy(selected),
      clientReceipt: buildClientReceiptCopy(selected),
      alertTitle: selected.privateMode
        ? 'No alert sent'
        : getLiveSignalPolicy(selected.eventType).alertTitle('Client'),
      alertMessage: selected.privateMode
        ? 'Private mode suppresses the live alert and intent notification.'
        : getLiveSignalPolicy(selected.eventType).alertMessage('Client'),
      followUp: getPrivacyAwareFollowUpCopy(selected.eventType),
      confidence: getLiveSignalConfidenceCopy(!selected.privateMode),
    }
  }, [selected])

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <section className="rounded-lg border border-stone-800 bg-stone-950 p-4">
        <h2 className="text-sm font-semibold text-stone-100">Test cases</h2>
        <div className="mt-3 space-y-2">
          {CASES.map((testCase) => (
            <button
              key={testCase.id}
              type="button"
              onClick={() => setSelectedId(testCase.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                selected.id === testCase.id
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-stone-800 bg-stone-900 hover:bg-stone-800'
              }`}
            >
              <span className="block text-sm font-medium text-stone-100">{testCase.label}</span>
              <span className="mt-1 block text-xs leading-5 text-stone-400">
                {testCase.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-stone-800 bg-stone-950 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-100">Simulation result</h2>
            <p className="mt-1 text-sm text-stone-400">
              This panel shows expected copy and signal behavior without writing to the database.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              selected.privateMode
                ? 'bg-amber-950 text-amber-100'
                : 'bg-emerald-950 text-emerald-100'
            }`}
          >
            {selected.privateMode ? 'Private' : 'Visible'}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ResultBlock title="Chef feed" value={result.chefFeed} />
          <ResultBlock title="Client trust receipt" value={result.clientReceipt} />
          <ResultBlock title="Alert title" value={result.alertTitle} />
          <ResultBlock title="Alert message" value={result.alertMessage} />
          <ResultBlock title="Safe follow-up" value={result.followUp} />
          <ResultBlock title="Confidence label" value={result.confidence} />
        </div>
      </section>
    </div>
  )
}

function ResultBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900 p-3">
      <p className="text-xs font-medium uppercase text-stone-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-100">{value}</p>
    </div>
  )
}
