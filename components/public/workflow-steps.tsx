'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { NO_CLICK_FIRST_PUBLIC_ENABLED } from '@/lib/marketing/no-click-rollout'

const STEPS = [
  {
    icon: '1',
    label: 'Intake',
    title: 'Capture the request',
    description:
      'Pull the request from a booking platform, email, text, or referral into one owned record with dates, guest context, and next actions.',
    href: '/auth/signup',
  },
  {
    icon: '2',
    label: 'Plan',
    title: 'Mirror the booking',
    description:
      'Track proposal status, final menu, prep lists, pricing, staffing, and production without losing the marketplace context.',
    href: '/auth/signup',
  },
  {
    icon: '3',
    label: 'Own',
    title: 'Own the relationship',
    description:
      'Once the booking is real, keep client notes, household details, approvals, and repeat-booking opportunities in your own system.',
    href: '/auth/signup',
  },
  {
    icon: '4',
    label: 'Revenue',
    title: 'See the real margin',
    description:
      'Track booking value, platform fees, payouts, expenses, and follow-up value instead of stopping at the marketplace payout screen.',
    href: '/auth/signup',
  },
]

export function WorkflowSteps() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [hasEntered, setHasEntered] = useState(false)
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [entranceStep, setEntranceStep] = useState(-1)
  const interactiveDetails = !NO_CLICK_FIRST_PUBLIC_ENABLED

  // Fire the entrance animation once when the section scrolls into view
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasEntered) {
          setHasEntered(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasEntered])

  // Stagger the entrance: light up each step one at a time
  useEffect(() => {
    if (!hasEntered) return

    let i = 0
    const interval = setInterval(() => {
      setEntranceStep(i)
      i++
      if (i >= STEPS.length) clearInterval(interval)
    }, 400)

    return () => clearInterval(interval)
  }, [hasEntered])

  return (
    <div ref={sectionRef} className="mx-auto max-w-2xl">
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {STEPS.map((step) => (
          <Link
            key={`mobile-${step.label}`}
            href={step.href}
            className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-left transition-colors hover:border-brand-700"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-300">
              {step.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-stone-100">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-stone-300">{step.description}</p>
          </Link>
        ))}
      </div>

      {/* Timeline row */}
      <div className="hidden items-start justify-center gap-0 sm:flex">
        {STEPS.map((step, i) => {
          const revealed = entranceStep >= i
          const isActive = interactiveDetails && activeStep === i

          return (
            <div key={step.label} className="flex items-center">
              {/* Step node - real link to signup */}
              <Link
                href={step.href}
                className="group relative flex flex-col items-center gap-2 rounded-lg px-3 py-2 no-underline outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                onMouseEnter={interactiveDetails ? () => setActiveStep(i) : undefined}
                onMouseLeave={interactiveDetails ? () => setActiveStep(null) : undefined}
                onFocus={interactiveDetails ? () => setActiveStep(i) : undefined}
                onBlur={interactiveDetails ? () => setActiveStep(null) : undefined}
                style={{
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? 'translateY(0)' : 'translateY(12px)',
                  transition: 'opacity 0.5s ease, transform 0.5s ease',
                }}
              >
                {/* Circle */}
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-brand-500 ring-4 ring-brand-700 scale-110'
                      : revealed
                        ? 'bg-brand-900 ring-0 scale-100'
                        : 'bg-stone-700 ring-0 scale-100'
                  }`}
                >
                  {step.icon}
                </div>

                {/* Label */}
                <span
                  className={`text-[11px] font-semibold uppercase tracking-widest transition-colors duration-300 ${
                    isActive ? 'text-brand-400' : 'text-stone-300'
                  }`}
                >
                  {step.label}
                </span>
              </Link>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className="mb-5 h-0.5 rounded-full transition-all duration-500"
                  style={{
                    width: 48,
                    backgroundColor:
                      entranceStep > i
                        ? 'var(--brand-400, #eda86b)'
                        : 'var(--color-stone-200, #e7e5e3)',
                    transform: entranceStep > i ? 'scaleX(1)' : 'scaleX(0)',
                    transformOrigin: 'left',
                    transition: 'transform 0.4s ease, background-color 0.4s ease',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {NO_CLICK_FIRST_PUBLIC_ENABLED ? (
        <div
          className={`mt-8 hidden gap-3 sm:grid sm:grid-cols-2 transition-opacity duration-500 ${
            entranceStep >= STEPS.length - 1 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {STEPS.map((step) => (
            <Link
              key={step.label}
              href={step.href}
              className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 text-left transition-colors hover:border-brand-700"
            >
              <p className="text-sm font-semibold text-stone-100">{step.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-stone-300">{step.description}</p>
              <p className="mt-2 text-xs font-medium text-brand-500">Sign up &rarr;</p>
            </Link>
          ))}
        </div>
      ) : (
        // Blurb area - shows on hover/focus
        <div className="relative mt-8 hidden min-h-[100px] items-start justify-center sm:flex">
          {activeStep !== null ? (
            <div
              key={activeStep}
              className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="text-lg font-bold text-stone-100">{STEPS[activeStep].title}</div>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-300">
                {STEPS[activeStep].description}
              </p>
              <span className="mt-3 text-xs font-medium text-brand-600 group-hover:underline">
                Sign up &rarr;
              </span>
            </div>
          ) : (
            <p
              className={`text-sm text-stone-300 italic transition-opacity duration-500 ${
                entranceStep >= STEPS.length - 1 ? 'opacity-100' : 'opacity-0'
              }`}
            >
              Hover each step for details
            </p>
          )}
        </div>
      )}
    </div>
  )
}
