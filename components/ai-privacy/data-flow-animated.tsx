'use client'

/**
 * DataFlowAnimated — Remotion Player wrapper for the privacy data-flow animation.
 *
 * Drop-in replacement for the SVG portion of DataFlowSchematic.
 * Uses the Remotion Player to play the composition inline (no video file needed).
 *
 * The Can/Cannot table is preserved from the original schematic.
 */

import { Player } from '@remotion/player'
import { Check, X } from 'lucide-react'
import { DataFlowComposition } from '@/lib/remotion/data-flow-composition'

export function DataFlowAnimated() {
  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-stone-900">Where Does Your Data Go?</h2>
        <p className="text-sm text-stone-500 mt-1">
          See exactly how ChefFlow handles your data compared to other AI services.
        </p>
      </div>

      {/* Animated diagram */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <Player
          component={DataFlowComposition}
          compositionWidth={560}
          compositionHeight={440}
          durationInFrames={360}
          fps={30}
          loop
          autoPlay
          style={{ width: '100%', aspectRatio: '560 / 440' }}
          controls={false}
        />
      </div>

      {/* What Remy CAN and CANNOT do — preserved from original */}
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="font-semibold text-stone-900 mb-4 text-center">
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
                <span className="text-sm text-stone-700">{item}</span>
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
                <span className="text-sm text-stone-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
