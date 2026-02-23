'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const STEPS = [
  {
    icon: '📬',
    label: 'Inquiry',
    title: 'A client reaches out',
    description: 'Inquiry captured with all the details — date, guests, dietary needs.',
    href: '/auth/signup',
  },
  {
    icon: '📅',
    label: 'Event',
    title: 'Plan the event',
    description: 'Build your menu, set pricing, and organize prep in one place.',
    href: '/auth/signup',
  },
  {
    icon: '📄',
    label: 'Quote',
    title: 'Send the proposal',
    description: 'Client gets a professional link — review, approve, done.',
    href: '/auth/signup',
  },
  {
    icon: '💳',
    label: 'Payment',
    title: 'Collect payment',
    description: 'Stripe-powered invoicing. Payment lands, you start cooking.',
    href: '/auth/signup',
  },
]

export function WorkflowSteps() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [hasEntered, setHasEntered] = useState(false)
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [entranceStep, setEntranceStep] = useState(-1)

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
      {/* Timeline row */}
      <div className="flex items-start justify-center gap-0">
        {STEPS.map((step, i) => {
          const revealed = entranceStep >= i
          const isActive = activeStep === i

          return (
            <div key={step.label} className="flex items-center">
              {/* Step node — real link to signup */}
              <Link
                href={step.href}
                className="group relative flex flex-col items-center gap-2 rounded-lg px-3 py-2 no-underline outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                onMouseEnter={() => setActiveStep(i)}
                onMouseLeave={() => setActiveStep(null)}
                onFocus={() => setActiveStep(i)}
                onBlur={() => setActiveStep(null)}
                style={{
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? 'translateY(0)' : 'translateY(12px)',
                  transition: 'opacity 0.5s ease, transform 0.5s ease',
                }}
              >
                {/* Circle */}
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-lg transition-all duration-300 ${
                    isActive
                      ? 'bg-brand-500 ring-4 ring-brand-200 scale-110'
                      : revealed
                        ? 'bg-brand-100 ring-0 scale-100'
                        : 'bg-stone-200 ring-0 scale-100'
                  }`}
                >
                  {step.icon}
                </div>

                {/* Label */}
                <span
                  className={`text-[11px] font-semibold uppercase tracking-widest transition-colors duration-300 ${
                    isActive ? 'text-brand-700' : 'text-stone-400'
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

      {/* Blurb area — shows on hover/focus */}
      <div className="relative mt-8 flex min-h-[100px] items-start justify-center">
        {activeStep !== null ? (
          <div
            key={activeStep}
            className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <div className="text-lg font-bold text-stone-900">{STEPS[activeStep].title}</div>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-600">
              {STEPS[activeStep].description}
            </p>
            <span className="mt-3 text-xs font-medium text-brand-600 group-hover:underline">
              Get started free &rarr;
            </span>
          </div>
        ) : (
          <p
            className={`text-sm text-stone-400 italic transition-opacity duration-500 ${
              entranceStep >= STEPS.length - 1 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Hover a step to learn more
          </p>
        )}
      </div>
    </div>
  )
}
