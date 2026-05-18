'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { COMMITMENT_CATALOG, type JourneyStage } from '@/lib/lifecycle/commitment-catalog'

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`

export function ServiceJourneyMap() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([1]))
  const [allExpanded, setAllExpanded] = useState(false)

  const totalCommitments = useMemo(
    () =>
      COMMITMENT_CATALOG.reduce(
        (sum, stage) =>
          sum + stage.categories.reduce((catSum, cat) => catSum + cat.items.length, 0),
        0
      ),
    []
  )

  function toggleStage(num: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  function toggleAll() {
    if (allExpanded) {
      setExpanded(new Set())
      setAllExpanded(false)
    } else {
      setExpanded(new Set(COMMITMENT_CATALOG.map((s) => s.number)))
      setAllExpanded(true)
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* Grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] mix-blend-overlay z-50"
        style={{ backgroundImage: GRAIN_SVG }}
      />

      {/* Top ambient glow */}
      <div className="absolute inset-x-0 top-0 h-[28rem] bg-gradient-to-b from-brand-950/40 via-brand-950/10 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="relative pt-16 pb-12 px-6 text-center max-w-3xl mx-auto">
        <p className="text-brand-500/50 text-[11px] font-semibold uppercase tracking-[0.35em] mb-5">
          The Complete Reference
        </p>
        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-stone-50 tracking-tight leading-[1.05]"
          style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
        >
          Service Mise en Place
        </h1>
        <p className="mt-5 text-stone-500 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          Every commitment from first contact to lasting relationship
        </p>

        {/* Stats bar */}
        <div className="mt-10 flex items-center justify-center gap-6 sm:gap-10">
          <Stat value="10" label="stages" />
          <div className="w-px h-10 bg-stone-800" />
          <Stat value={String(totalCommitments)} label="commitments" />
          <div className="w-px h-10 bg-stone-800" />
          <button
            onClick={toggleAll}
            className="text-brand-400/80 text-[11px] font-semibold uppercase tracking-[0.12em] hover:text-brand-300 transition-colors cursor-pointer"
          >
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      </header>

      {/* Journey timeline */}
      <section className="relative max-w-3xl mx-auto px-4 sm:px-6 pb-24">
        {/* Vertical spine */}
        <div className="absolute left-[1.65rem] sm:left-[2.15rem] top-0 bottom-0 w-px">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-500/50 via-brand-500/15 to-transparent" />
        </div>

        {COMMITMENT_CATALOG.map((stage) => (
          <StageSection
            key={stage.number}
            stage={stage}
            isExpanded={expanded.has(stage.number)}
            onToggle={() => toggleStage(stage.number)}
          />
        ))}

        {/* Parallel workflows footer */}
        <div className="relative pl-14 sm:pl-20 mt-8">
          <div className="absolute left-[1.4rem] sm:left-[1.9rem] w-2.5 h-2.5 rounded-full border-2 border-stone-700 bg-stone-950" />
          <div className="rounded-lg p-5 bg-stone-900/40 border border-stone-800/40">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-600 mb-2">
              Parallel Workflows
            </p>
            <p className="text-stone-500 text-sm leading-relaxed">
              Cancellation and reschedule can trigger from any stage, each with different financial
              and operational consequences. Chef profile setup (licensing, insurance, contracts,
              payment processing) is a one-time foundation that enables everything above.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <span className="block text-2xl sm:text-3xl font-bold text-stone-100 tabular-nums">
        {value}
      </span>
      <span className="text-[10px] text-stone-600 uppercase tracking-[0.15em] font-medium">
        {label}
      </span>
    </div>
  )
}

function StageSection({
  stage,
  isExpanded,
  onToggle,
}: {
  stage: JourneyStage
  isExpanded: boolean
  onToggle: () => void
}) {
  const itemCount = stage.categories.reduce((sum, cat) => sum + cat.items.length, 0)

  return (
    <div className="relative pl-14 sm:pl-20 mb-10 sm:mb-14">
      {/* Timeline dot */}
      <div
        className={cn(
          'absolute left-[1.15rem] sm:left-[1.65rem] top-[0.35rem] w-3.5 h-3.5 rounded-full border-[3px] transition-all duration-500',
          isExpanded
            ? 'bg-brand-500 border-brand-400/30 shadow-[0_0_16px_rgba(237,168,107,0.35)]'
            : 'bg-stone-800 border-stone-700 hover:bg-stone-700'
        )}
      />

      {/* Stage number watermark */}
      <span
        className="absolute -left-1 sm:left-0 -top-5 text-[5.5rem] sm:text-[7rem] text-stone-900/30 italic select-none pointer-events-none leading-none"
        style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
      >
        {String(stage.number).padStart(2, '0')}
      </span>

      {/* Content */}
      <div className="relative">
        {/* Clickable header */}
        <button
          onClick={onToggle}
          className="w-full text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-lg -mx-2 px-2 py-1 cursor-pointer"
        >
          <h2
            className="text-xl sm:text-2xl md:text-[1.75rem] text-stone-100 group-hover:text-stone-50 transition-colors leading-tight"
            style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
          >
            {stage.name}
          </h2>
          <p className="mt-1.5 text-stone-500 text-[13px] leading-relaxed max-w-lg">
            {stage.tagline}
          </p>
          <div className="mt-2.5 flex items-center gap-3">
            <span className="text-brand-500/60 text-[11px] font-semibold tabular-nums tracking-wide">
              {itemCount} commitments
            </span>
            <svg
              className={cn(
                'w-3 h-3 text-stone-600 transition-transform duration-500 ease-[var(--ease-spring)]',
                isExpanded && 'rotate-180'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Expandable commitment list */}
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-500 ease-[var(--ease-spring)]',
            isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          <div className="overflow-hidden">
            <div className="pt-6 space-y-6">
              {stage.categories.map((cat) => (
                <div key={cat.name}>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500/50 mb-3 pl-3 border-l-2 border-brand-500/20">
                    {cat.name}
                  </h3>
                  <ul className="space-y-0.5">
                    {cat.items.map((item) => (
                      <li
                        key={item.label}
                        className="flex items-start gap-2.5 py-[5px] text-stone-400 text-[13px] leading-relaxed group/item"
                      >
                        <svg
                          className="w-[11px] h-[11px] mt-[5px] text-stone-700/80 flex-shrink-0 group-hover/item:text-brand-500/40 transition-colors duration-300"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                        <span className="group-hover/item:text-stone-300 transition-colors duration-200">
                          {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
