'use client'

/**
 * RemyOnboardingWizard — 5-step walkthrough that every chef sees
 * before they can use Remy. Teaches best practices, shows the data
 * flow schematic, lets them practice deleting data, and requires
 * explicit opt-in.
 *
 * Steps:
 * 1. "Meet Remy" — what it is, what it does
 * 2. "Your Data Stays in ChefFlow" — the schematic
 * 3. "You're in Control" — show the delete/toggle controls
 * 4. "Best Practices" — how to use AI safely
 * 5. "Ready?" — explicit opt-in with a big toggle
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
  EyeOff,
  HardDrive,
  Wifi,
  WifiOff,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { DataFlowSchematic } from './data-flow-schematic'
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
    subtitle: 'Your private AI sous chef',
  },
  {
    id: 'data',
    icon: <Shield className="h-5 w-5" />,
    title: 'Your Data Stays in ChefFlow',
    subtitle: 'See exactly where data goes',
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
    subtitle: 'How to use AI safely',
  },
  {
    id: 'ready',
    icon: <Power className="h-5 w-5" />,
    title: 'Ready?',
    subtitle: 'Your choice to opt in',
  },
]

export function RemyOnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [completing, setCompleting] = useState(false)
  const [practiceDeleted, setPracticeDeleted] = useState(false)

  const currentStep = STEPS[step]
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
                    : 'text-stone-400'
              }`}
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i === step
                    ? 'bg-brand-500 text-white scale-110'
                    : i < step
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-stone-100 text-stone-400'
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className="hidden sm:inline">{s.title}</span>
            </button>
          ))}
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8">
          {/* ─── Step 1: Meet Remy ──────────────────────────── */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-100 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-brand-600" />
                </div>
                <h2 className="text-2xl font-bold text-stone-900">Meet Remy</h2>
                <p className="text-stone-500 mt-2 max-w-lg mx-auto">
                  Remy is your private AI sous chef. It helps you draft emails, plan menus, manage
                  prep timelines, and run your business more efficiently.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: <HardDrive className="h-5 w-5 text-brand-500" />,
                    title: 'Private AI',
                    desc: 'Remy runs on ChefFlow\u2019s own servers using Ollama. Your data is never sent to OpenAI, Google, or any third party.',
                  },
                  {
                    icon: <Lock className="h-5 w-5 text-brand-500" />,
                    title: '100% Private',
                    desc: 'Your client names, budgets, recipes, and conversations stay within ChefFlow \u2014 never shared externally.',
                  },
                  {
                    icon: <Eye className="h-5 w-5 text-brand-500" />,
                    title: 'Fully Transparent',
                    desc: 'You can see exactly what Remy knows, delete anything at any time, or turn it off completely.',
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2"
                  >
                    {card.icon}
                    <h4 className="font-semibold text-stone-900 text-sm">{card.title}</h4>
                    <p className="text-xs text-stone-500 leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm text-amber-800">
                  <strong>Why this matters:</strong> Most AI services (ChatGPT, Google Gemini, etc.)
                  send your data to their servers where it can be stored, analyzed, or used to train
                  their models. Remy is different — it uses a private AI engine called Ollama that
                  runs on ChefFlow&apos;s own infrastructure. Your data is never sent to any
                  third-party AI provider. It stays within ChefFlow, period.
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 2: Your Data Stays in ChefFlow (The Schematic) ─── */}
          {step === 1 && <DataFlowSchematic />}

          {/* ─── Step 3: You're in Control ──────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                  <Trash2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-stone-900">You&apos;re in Control</h2>
                <p className="text-stone-500 mt-2 max-w-lg mx-auto">
                  You can delete any data Remy creates at any time. When you delete it, it&apos;s
                  truly gone — not hidden, not archived, not recoverable. Gone.
                </p>
              </div>

              {/* Interactive practice section */}
              <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-5 space-y-4">
                <h3 className="font-semibold text-stone-900 text-center">
                  Try It — Practice Deleting Data
                </h3>
                <p className="text-sm text-stone-500 text-center">
                  This is a safe demo. Click the delete button to see how it works.
                </p>

                {!practiceDeleted ? (
                  <div className="space-y-3">
                    {/* Fake data items */}
                    {[
                      { type: 'Conversation', text: 'Menu planning with Remy - 3 messages' },
                      { type: 'Memory', text: 'Chef prefers rustic plating style' },
                      { type: 'Draft', text: 'Follow-up email to Mrs. Chen' },
                    ].map((item) => (
                      <div
                        key={item.text}
                        className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3"
                      >
                        <div>
                          <span className="text-xs font-medium text-stone-400 uppercase">
                            {item.type}
                          </span>
                          <p className="text-sm text-stone-700">{item.text}</p>
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
                    <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-emerald-700">All deleted. Truly gone.</p>
                    <p className="text-xs text-stone-500">
                      That&apos;s exactly how it works with real data too. One click, permanently
                      deleted.
                    </p>
                    <button
                      onClick={() => setPracticeDeleted(false)}
                      className="text-xs text-brand-600 hover:text-brand-700 underline"
                    >
                      Reset demo
                    </button>
                  </div>
                )}
              </div>

              {/* What you can delete */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    title: 'Conversations',
                    desc: 'Every chat with Remy. Delete one or delete them all.',
                  },
                  {
                    title: 'Memories',
                    desc: 'Things Remy has learned about you. Wipe them anytime.',
                  },
                  {
                    title: 'Drafts & Artifacts',
                    desc: 'Emails, notes, and anything Remy created. Your call.',
                  },
                  {
                    title: 'Everything at Once',
                    desc: 'One button to delete all AI data. Nuclear option, always available.',
                  },
                ].map((item) => (
                  <div key={item.title} className="rounded-lg border border-stone-200 bg-white p-3">
                    <h4 className="font-medium text-stone-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-stone-500 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 4: Best Practices ────────────────────── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-stone-900">Best Practices</h2>
                <p className="text-stone-500 mt-2 max-w-lg mx-auto">
                  Here&apos;s how to get the most out of Remy while staying in complete control.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    number: '1',
                    title: 'Review before sending',
                    desc: 'Remy drafts emails and messages, but nothing gets sent until you review and approve it. Always read what Remy wrote before hitting send.',
                    color: 'brand',
                  },
                  {
                    number: '2',
                    title: 'Clean up regularly',
                    desc: "Visit Settings > AI & Privacy anytime to see what data Remy has accumulated. Delete conversations you don't need anymore. Think of it like clearing your browser history.",
                    color: 'emerald',
                  },
                  {
                    number: '3',
                    title: 'Control what Remy remembers',
                    desc: "You can turn off Remy's memory feature entirely. When memory is off, every conversation starts fresh — Remy won't recall previous interactions.",
                    color: 'blue',
                  },
                  {
                    number: '4',
                    title: 'Turn features on and off',
                    desc: "Don't want Remy to draft documents? Turn off document drafting. Don't want suggestions? Turn off suggestions. Each feature is its own toggle.",
                    color: 'purple',
                  },
                  {
                    number: '5',
                    title: 'Turn Remy off completely anytime',
                    desc: "Changed your mind? Go to Settings > AI & Privacy and flip the master switch. Remy stops immediately. Your existing data stays until you decide to delete it — we don't make that decision for you.",
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
                      <h4 className="font-semibold text-stone-900 text-sm">{practice.title}</h4>
                      <p className="text-sm text-stone-500 mt-0.5 leading-relaxed">
                        {practice.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-stone-50 border border-stone-200 p-4">
                <p className="text-sm text-stone-600">
                  <strong>Remember:</strong> Remy is a tool, not a decision-maker. It assists you —
                  it never acts on its own. Every email, every suggestion, every action requires
                  your explicit approval before anything happens.
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 5: Ready / Opt-In ────────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-100 flex items-center justify-center mb-4">
                  <Power className="h-8 w-8 text-brand-600" />
                </div>
                <h2 className="text-2xl font-bold text-stone-900">You&apos;re Ready</h2>
                <p className="text-stone-500 mt-2 max-w-lg mx-auto">
                  You now know exactly how Remy works, where your data goes (nowhere), and how to
                  stay in control. The choice is yours.
                </p>
              </div>

              {/* Summary card */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
                <h3 className="font-semibold text-emerald-900">What you&apos;ve learned:</h3>
                {[
                  'Remy runs on ChefFlow\u2019s private servers — not OpenAI, not Google',
                  'Your data never leaves ChefFlow',
                  'You can delete any or all AI data at any time',
                  'Every Remy feature can be individually toggled',
                  'Remy assists only — it never acts without your approval',
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
                      Enable Remy — I&apos;m In
                    </>
                  )}
                </button>
                <p className="text-xs text-stone-400">
                  You can turn Remy off at any time from Settings &gt; AI &amp; Privacy.
                </p>
              </div>

              {/* Skip option */}
              <div className="text-center border-t border-stone-100 pt-4">
                <p className="text-sm text-stone-500">
                  Not ready yet? No problem. You can come back here anytime from Settings.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation footer */}
        <div className="border-t border-stone-200 bg-stone-50 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            className="inline-flex items-center gap-1 text-sm font-medium text-stone-600
                       hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <span className="text-xs text-stone-400">
            Step {step + 1} of {STEPS.length}
          </span>

          {!isLast && (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600
                         hover:text-brand-700 transition-colors"
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
