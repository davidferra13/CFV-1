'use client'

/**
 * RemyOnboardingWizard — 5-step walkthrough before first Remy use.
 *
 * Steps:
 * 1. "Meet Remy" — what it is, what it does
 * 2. "How It Works" — the data flow schematic
 * 3. "You're in Control" — delete capabilities
 * 4. "Best Practices" — how to use AI effectively
 * 5. "Ready?" — explicit opt-in
 *
 * Privacy is mentioned once, confidently, not belabored.
 */

import { useState } from 'react'
import {
  Bot,
  Shield,
  Trash2,
  BookOpen,
  Power,
  ChevronRight,
  ChevronLeft,
  Check,
  Lock,
  Eye,
  HardDrive,
} from '@/components/ui/icons'
import { DataFlowAnimated } from './data-flow-animated'
import { completeOnboarding } from '@/lib/ai/privacy-actions'

type OnboardingStep = {
  id: string
  icon: React.ReactNode
  title: string
  subtitle: string
}

const STEPS: OnboardingStep[] = [
  {
    id: 'meet',
    icon: <Bot className="h-5 w-5" />,
    title: 'Meet Remy',
    subtitle: 'Your AI sous chef',
  },
  {
    id: 'data',
    icon: <Shield className="h-5 w-5" />,
    title: 'How It Works',
    subtitle: 'See the data flow',
  },
  {
    id: 'control',
    icon: <Trash2 className="h-5 w-5" />,
    title: "You're in Control",
    subtitle: 'Delete anything, anytime',
  },
  {
    id: 'practices',
    icon: <BookOpen className="h-5 w-5" />,
    title: 'Best Practices',
    subtitle: 'Tips for using Remy well',
  },
  {
    id: 'ready',
    icon: <Power className="h-5 w-5" />,
    title: 'Ready?',
    subtitle: 'Your choice to enable',
  },
]

export function RemyOnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [completing, setCompleting] = useState(false)
  const [practiceDeleted, setPracticeDeleted] = useState(false)

  const isLast = step === STEPS.length - 1
  const isFirst = step === 0

  const handleComplete = async () => {
    setCompleting(true)
    try {
      const result = await completeOnboarding()
      if (result.success) {
        onComplete()
      }
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => i <= step && setStep(i)}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                i === step
                  ? 'text-brand-600'
                  : i < step
                    ? 'text-emerald-600 cursor-pointer'
                    : 'text-stone-300'
              }`}
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i === step
                    ? 'bg-brand-500 text-white scale-110'
                    : i < step
                      ? 'bg-emerald-900 text-emerald-700'
                      : 'bg-stone-800 text-stone-300'
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className="hidden sm:inline">{s.title}</span>
            </button>
          ))}
        </div>
        <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-stone-700 bg-stone-900 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8">
          {/* ─── Step 1: Meet Remy ──────────────────────────── */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-900 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-brand-600" />
                </div>
                <h2 className="text-2xl font-bold text-stone-100">Meet Remy</h2>
                <p className="text-stone-500 mt-2 max-w-lg mx-auto">
                  Remy is your AI sous chef. It helps you draft emails, plan menus, manage prep
                  timelines, and run your business more efficiently.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: <HardDrive className="h-5 w-5 text-brand-500" />,
                    title: 'Private AI',
                    desc: 'Remy runs on ChefFlow\u2019s private servers. Your conversations are processed locally and never stored on our servers.',
                  },
                  {
                    icon: <Lock className="h-5 w-5 text-brand-500" />,
                    title: 'Your Data',
                    desc: 'Client names, budgets, recipes — everything stays within ChefFlow. Conversation history lives in your browser.',
                  },
                  {
                    icon: <Eye className="h-5 w-5 text-brand-500" />,
                    title: 'Full Control',
                    desc: 'Delete anything at any time, turn Remy off whenever you want, or share a conversation with support if you need help.',
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="rounded-xl border border-stone-700 bg-stone-800/50 p-4 space-y-2"
                  >
                    {card.icon}
                    <h4 className="font-semibold text-stone-100 text-sm">{card.title}</h4>
                    <p className="text-xs text-stone-500 leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 2: How It Works (The Schematic) ─────── */}
          {step === 1 && <DataFlowAnimated />}

          {/* ─── Step 3: You're in Control ────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-900 flex items-center justify-center mb-4">
                  <Trash2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-stone-100">You&apos;re in Control</h2>
                <p className="text-stone-500 mt-2 max-w-lg mx-auto">
                  Your conversation history lives in your browser. You can clear it at any time —
                  and when you do, it&apos;s gone. Not archived, not hidden. Gone.
                </p>
              </div>

              {/* Interactive practice section */}
              <div className="rounded-xl border-2 border-dashed border-stone-600 bg-stone-800 p-5 space-y-4">
                <h3 className="font-semibold text-stone-100 text-center">
                  Try It — Practice Deleting Data
                </h3>
                <p className="text-sm text-stone-500 text-center">
                  This is a safe demo. Click delete to see how it works.
                </p>

                {!practiceDeleted ? (
                  <div className="space-y-3">
                    {[
                      { type: 'Conversation', text: 'Menu planning with Remy - 3 messages' },
                      { type: 'Memory', text: 'Chef prefers rustic plating style' },
                      { type: 'Draft', text: 'Follow-up email to Mrs. Chen' },
                    ].map((item) => (
                      <div
                        key={item.text}
                        className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-900 p-3"
                      >
                        <div>
                          <span className="text-xs font-medium text-stone-300 uppercase">
                            {item.type}
                          </span>
                          <p className="text-sm text-stone-300">{item.text}</p>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setPracticeDeleted(true)}
                      className="w-full rounded-lg bg-red-500 text-white py-2.5 text-sm font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete All (Practice)
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-full bg-emerald-900 flex items-center justify-center">
                      <Check className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-emerald-700">All deleted. Truly gone.</p>
                    <p className="text-xs text-stone-500">
                      That&apos;s how it works with real data too.
                    </p>
                    <button
                      onClick={() => setPracticeDeleted(false)}
                      className="text-xs text-brand-600 hover:text-brand-400 underline"
                    >
                      Reset demo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Step 4: Best Practices ──────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-900 flex items-center justify-center mb-4">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-stone-100">Best Practices</h2>
                <p className="text-stone-500 mt-2 max-w-lg mx-auto">Get the most out of Remy.</p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    number: '1',
                    title: 'Review before sending',
                    desc: 'Remy drafts emails and messages for you to review. Nothing gets sent until you approve it.',
                    color: 'brand',
                  },
                  {
                    number: '2',
                    title: 'Be specific',
                    desc: 'The more context you give Remy, the better it can help. "Plan a menu for 8 guests with nut allergies" works better than "plan a menu."',
                    color: 'emerald',
                  },
                  {
                    number: '3',
                    title: 'Control what Remy remembers',
                    desc: "You can turn off Remy's memory from Settings. When memory is off, every conversation starts fresh.",
                    color: 'blue',
                  },
                  {
                    number: '4',
                    title: 'Turn it off anytime',
                    desc: 'Go to Settings > Privacy & Data and flip the switch. Remy stops immediately. Your data stays until you choose to delete it.',
                    color: 'amber',
                  },
                ].map((practice) => (
                  <div key={practice.number} className="flex gap-4 items-start">
                    <div
                      className={`shrink-0 h-8 w-8 rounded-full bg-${practice.color}-100 flex items-center justify-center`}
                    >
                      <span className={`text-sm font-bold text-${practice.color}-700`}>
                        {practice.number}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-stone-100 text-sm">{practice.title}</h4>
                      <p className="text-sm text-stone-500 mt-0.5 leading-relaxed">
                        {practice.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-stone-800 border border-stone-700 p-4">
                <p className="text-sm text-stone-300">
                  <strong>Remember:</strong> Remy is a tool, not a decision-maker. Every email,
                  every suggestion, every action requires your approval.
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 5: Ready / Opt-In ──────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-900 flex items-center justify-center mb-4">
                  <Power className="h-8 w-8 text-brand-600" />
                </div>
                <h2 className="text-2xl font-bold text-stone-100">You&apos;re Ready</h2>
                <p className="text-stone-500 mt-2 max-w-lg mx-auto">
                  You know how Remy works and how to stay in control. The choice is yours.
                </p>
              </div>

              {/* Summary card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-950/50 p-5 space-y-3">
                <h3 className="font-semibold text-emerald-900">Quick recap:</h3>
                {[
                  'Remy runs on ChefFlow\u2019s private servers — no third-party AI',
                  'Conversations stay in your browser, not on our servers',
                  'Delete anything at any time',
                  'Remy assists only — never acts without your approval',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="text-sm text-emerald-800">{item}</span>
                  </div>
                ))}
              </div>

              {/* Opt-in button */}
              <div className="text-center space-y-3">
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-8 py-3.5
                             text-base font-semibold text-white hover:bg-brand-600
                             disabled:opacity-50 disabled:cursor-not-allowed transition-all
                             shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30"
                >
                  {completing ? (
                    <>
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    <>
                      <Power className="h-5 w-5" />
                      Enable Remy
                    </>
                  )}
                </button>
                <p className="text-xs text-stone-300">
                  You can turn Remy off at any time from Settings.
                </p>
              </div>

              {/* Skip option */}
              <div className="text-center border-t border-stone-800 pt-4">
                <p className="text-sm text-stone-500">
                  Not ready? No problem. Come back anytime from Settings.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation footer */}
        <div className="border-t border-stone-700 bg-stone-800 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            className="inline-flex items-center gap-1 text-sm font-medium text-stone-300
                       hover:text-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <span className="text-xs text-stone-300">
            Step {step + 1} of {STEPS.length}
          </span>

          {!isLast && (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600
                         hover:text-brand-400 transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {isLast && <div />}
        </div>
      </div>
    </div>
  )
}
