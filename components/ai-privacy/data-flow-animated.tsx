'use client'

/**
 * DataFlowAnimated — Static comparison of "Other AI" vs "ChefFlow + Remy".
 *
 * Replaced the Remotion looping animation with a clean side-by-side
 * layout that's always visible and doesn't glitch or loop.
 *
 * Preserved: the Can/Cannot table below.
 */

import { Check, X, AlertTriangle, Shield } from '@/components/ui/icons'

export function DataFlowAnimated() {
  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-stone-100">Where Does Your Data Go?</h2>
        <p className="text-sm text-stone-500 mt-1">
          See exactly how ChefFlow handles your data compared to other AI services.
        </p>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Red side — Other AI Apps */}
        <div className="rounded-xl border-2 border-red-200 bg-red-950/50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-900 text-sm">
              ☁️
            </div>
            <div>
              <div className="text-sm font-semibold text-red-900">Other AI Apps</div>
              <div className="text-[11px] text-red-600">Data sent to third parties</div>
            </div>
          </div>

          {/* Flow diagram */}
          <div className="flex flex-col items-center gap-1 py-2">
            <div className="rounded-lg border border-red-200 bg-red-950 px-4 py-2 text-center">
              <div className="text-xs font-semibold text-red-900">You</div>
              <div className="text-[10px] text-red-500">Client names, budgets...</div>
            </div>
            <div className="text-red-400 text-xs">↓ sent to</div>
            <div className="rounded-lg border border-red-300 bg-red-900 px-4 py-2 text-center">
              <div className="text-xs font-semibold text-red-900">Their Servers</div>
              <div className="text-[10px] text-red-500">OpenAI, Google, etc.</div>
            </div>
            <div className="text-red-400 text-xs">→</div>
            <div className="rounded-lg border border-red-300 bg-red-900 px-4 py-2 text-center">
              <div className="text-xs font-semibold text-red-900">Third Parties</div>
              <div className="text-[10px] text-red-500">Training, ads, leaks</div>
            </div>
          </div>

          {/* Bullet points */}
          <div className="space-y-2 pt-1">
            {[
              'Data stored on remote servers',
              'May be used to train their AI',
              "You can't truly delete it",
            ].map((text) => (
              <div key={text} className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                <span className="text-xs text-red-800">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Green side — ChefFlow + Remy */}
        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-950/50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900 text-sm">
              🛡️
            </div>
            <div>
              <div className="text-sm font-semibold text-emerald-900">ChefFlow + Remy</div>
              <div className="text-[11px] text-emerald-600">Data never leaves ChefFlow</div>
            </div>
          </div>

          {/* Flow diagram */}
          <div className="flex flex-col items-center gap-1 py-2">
            <div className="rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-950 p-3 space-y-2 w-full">
              <div className="text-[10px] font-semibold text-emerald-800 text-center">
                ChefFlow (everything stays here)
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="rounded-md border border-emerald-300 bg-emerald-900 px-3 py-1.5 text-center">
                  <div className="text-xs font-semibold text-emerald-900">Your Data</div>
                  <div className="text-[10px] text-emerald-600">Clients, menus</div>
                </div>
                <div className="text-emerald-400 text-xs">⇄</div>
                <div className="rounded-md border border-emerald-300 bg-emerald-900 px-3 py-1.5 text-center">
                  <div className="text-xs font-semibold text-emerald-900">Remy (AI)</div>
                  <div className="text-[10px] text-emerald-600">Private servers</div>
                </div>
              </div>
            </div>
            <div className="rounded-md border border-emerald-300 bg-emerald-200 px-3 py-1.5 text-center mt-1">
              <div className="flex items-center gap-1 justify-center">
                <Shield className="h-3 w-3 text-emerald-700" />
                <span className="text-[10px] font-bold text-emerald-800">
                  No Third-Party AI Services
                </span>
              </div>
            </div>
          </div>

          {/* Bullet points */}
          <div className="space-y-2 pt-1">
            {[
              "AI runs on ChefFlow's own servers",
              'Zero data sent to any company',
              "Delete anytime — it's truly gone",
            ].map((text) => (
              <div key={text} className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-xs text-emerald-800">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What Remy CAN and CANNOT do — preserved from original */}
      <div className="rounded-xl border border-stone-700 bg-stone-900 p-5">
        <h3 className="font-semibold text-stone-100 mb-4 text-center">
          What Remy Can &amp; Cannot Do
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Remy Can
            </p>
            {[
              'Read your recipes and menus (locally)',
              'Help draft emails you review first',
              'Suggest prep timelines',
              'Remember your preferences (if you allow it)',
              'Analyze dietary needs for events',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm text-stone-300">{item}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
              Remy Cannot
            </p>
            {[
              'Send your data to any external server',
              'Share data with other companies',
              'Make decisions without your approval',
              "Access anything you haven't shared",
              'Operate after you turn it off',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <span className="text-sm text-stone-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
