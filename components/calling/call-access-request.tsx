'use client'

/**
 * CallAccessRequest
 *
 * Shown when the supplier_calling feature flag is off for this chef.
 * Explains what the feature does and lets the chef request access.
 * Writes a supplier_calling_requested flag so admin can see it in the flags panel.
 */

import { useState } from 'react'
import { Phone, Check, Loader2, Mic, DollarSign, Clock } from 'lucide-react'
import { requestCallingAccess } from '@/lib/calling/twilio-actions'

export function CallAccessRequest() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'already'>('idle')

  async function handleRequest() {
    setState('loading')
    try {
      const result = await requestCallingAccess()
      if (result.alreadyRequested) {
        setState('already')
      } else {
        setState('done')
      }
    } catch {
      setState('idle')
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-violet-950 rounded-lg mt-0.5">
          <Phone size={18} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-stone-100">Call Sheet</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            ChefFlow calls your suppliers to check ingredient availability and capture prices. You
            hear back in minutes, not hours.
          </p>
        </div>
      </div>

      {/* What it does */}
      <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 space-y-5">
        <p className="text-sm font-semibold text-stone-300">What this does</p>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-violet-950 rounded-md mt-0.5">
              <Phone className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-200">Calls vendors on your behalf</p>
              <p className="text-xs text-stone-500 mt-0.5">
                Type an ingredient, select which suppliers to call, and hit Call. A human-sounding
                AI voice handles the conversation.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-violet-950 rounded-md mt-0.5">
              <DollarSign className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-200">Captures price and availability</p>
              <p className="text-xs text-stone-500 mt-0.5">
                The AI asks yes/no on stock, then follows up for price and quantity. Results appear
                live in the Call Sheet as each call finishes.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-violet-950 rounded-md mt-0.5">
              <Mic className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-200">Full transcripts and recordings</p>
              <p className="text-xs text-stone-500 mt-0.5">
                Every call is recorded and transcribed. Inbound callbacks and voicemails go to your
                Inbox tab automatically.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-violet-950 rounded-md mt-0.5">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-200">Business hours only</p>
              <p className="text-xs text-stone-500 mt-0.5">
                Calls go out 8am to 7pm only. Up to 20 calls per day. Never calls clients, only
                vendors and business contacts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works - 3 steps */}
      <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 space-y-4">
        <p className="text-sm font-semibold text-stone-300">How it works</p>
        <div className="space-y-3">
          {[
            { n: '1', text: 'Type an ingredient (e.g. "haddock" or "black truffle")' },
            {
              n: '2',
              text: 'Select which vendors to call from your saved list or the national directory',
            },
            { n: '3', text: 'Hit Call. Results stream back live as each vendor picks up.' },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-900 text-violet-300 text-xs font-bold flex items-center justify-center">
                {n}
              </span>
              <p className="text-sm text-stone-400">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Requirement note */}
      <p className="text-xs text-stone-600">
        Requires a Twilio account (calls are billed per minute via your Twilio balance). Your admin
        enables this feature after verifying your setup.
      </p>

      {/* CTA */}
      {state === 'idle' && (
        <button
          type="button"
          onClick={handleRequest}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
        >
          <Phone className="w-4 h-4" />
          Request Access
        </button>
      )}

      {state === 'loading' && (
        <button
          type="button"
          disabled
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 opacity-60 text-white text-sm font-semibold cursor-not-allowed"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Sending request...
        </button>
      )}

      {state === 'done' && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <Check className="w-4 h-4" />
          Request sent. Your admin will enable it shortly.
        </div>
      )}

      {state === 'already' && (
        <div className="flex items-center gap-2 text-sm text-stone-400">
          <Check className="w-4 h-4" />
          Request already on file. Your admin will enable it shortly.
        </div>
      )}
    </div>
  )
}
