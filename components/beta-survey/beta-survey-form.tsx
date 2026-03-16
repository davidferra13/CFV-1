'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup } from '@/components/ui/radio-group'
import { RatingScale } from '@/components/ui/rating-scale'
import { CheckboxGroup } from '@/components/ui/checkbox-group'
import type { BetaSurveyDefinition, SurveyQuestion } from '@/lib/beta-survey/survey-utils'
import { getStepsForSurvey } from '@/lib/beta-survey/survey-utils'
import { submitBetaSurveyAuthenticated, submitBetaSurveyPublic } from '@/lib/beta-survey/actions'

type BetaSurveyFormProps = {
  survey: BetaSurveyDefinition
  /** For authenticated submissions */
  mode: 'authenticated' | 'public'
  /** For public mode - invite token */
  inviteToken?: string
  /** Pre-filled respondent info (from invite) */
  prefillName?: string
  prefillEmail?: string
  /** Where to redirect after submit */
  redirectTo?: string
}

export function BetaSurveyForm({
  survey,
  mode,
  inviteToken,
  prefillName,
  prefillEmail,
  redirectTo,
}: BetaSurveyFormProps) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [name, setName] = useState(prefillName || '')
  const [email, setEmail] = useState(prefillEmail || '')
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const steps = useMemo(
    () => getStepsForSurvey(survey.survey_type as 'pre_beta' | 'post_beta', survey.questions),
    [survey]
  )

  const questionsMap = useMemo(() => {
    const map = new Map<string, SurveyQuestion>()
    for (const q of survey.questions) {
      map.set(q.id, q)
    }
    return map
  }, [survey.questions])

  const currentQuestionIds = steps[currentStep]?.questionIds || []
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  // Check if current step has all required answers
  const stepComplete = currentQuestionIds.every((id) => {
    const q = questionsMap.get(id)
    if (!q || !q.required) return true
    const val = answers[id]
    if (val === undefined || val === null || val === '') return false
    if (Array.isArray(val) && val.length === 0) return false
    return true
  })

  const setAnswer = (id: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      let result: { success: boolean; error?: string }

      if (mode === 'authenticated') {
        result = await submitBetaSurveyAuthenticated(survey.slug, answers)
      } else if (inviteToken) {
        result = await submitBetaSurveyPublic(inviteToken, answers, {
          name: name.trim() || undefined,
          email: email.trim() || undefined,
        })
      } else {
        result = { success: false, error: 'Missing invite token.' }
      }

      if (!result.success) {
        setError(result.error || 'Failed to submit survey.')
        setLoading(false)
        return
      }

      setSubmitted(true)

      if (redirectTo) {
        setTimeout(() => router.push(redirectTo), 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      setLoading(false)
    }
  }

  // ─── Success screen ─────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-stone-100 mb-2">Thank you!</h2>
        <p className="text-stone-400">
          Your feedback is invaluable and will directly shape what we build next.
        </p>
        {redirectTo && <p className="text-stone-500 text-sm mt-4">Redirecting you back...</p>}
      </div>
    )
  }

  // ─── Form ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-stone-500">
          <span>
            Step {currentStep + 1} of {steps.length}
          </span>
          <span>{steps[currentStep]?.label}</span>
        </div>
        <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step indicator pills */}
      <div className="flex gap-2 flex-wrap">
        {steps.map((step, i) => (
          <button
            key={step.label}
            type="button"
            onClick={() => i < currentStep && setCurrentStep(i)}
            disabled={i > currentStep}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              i === currentStep
                ? 'bg-brand-500 text-white'
                : i < currentStep
                  ? 'bg-stone-700 text-stone-300 hover:bg-stone-600 cursor-pointer'
                  : 'bg-stone-800 text-stone-600 cursor-not-allowed'
            }`}
          >
            {step.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Public mode: name/email fields on first step */}
      {mode === 'public' && isFirstStep && (
        <div className="space-y-4 pb-4 border-b border-stone-700">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Your name <span className="text-stone-500">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1.5">
              Your email <span className="text-stone-500">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>
      )}

      {/* Questions for current step */}
      <div className="space-y-6">
        {currentQuestionIds.map((qId) => {
          const question = questionsMap.get(qId)
          if (!question) return null
          return (
            <QuestionRenderer
              key={qId}
              question={question}
              value={answers[qId]}
              onChange={(val) => setAnswer(qId, val)}
            />
          )
        })}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-3 pt-4 border-t border-stone-700">
        {!isFirstStep && (
          <Button
            variant="secondary"
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={loading}
          >
            Back
          </Button>
        )}
        <div className="flex-1" />
        {isLastStep ? (
          <Button onClick={handleSubmit} loading={loading} disabled={loading || !stepComplete}>
            Submit Survey
          </Button>
        ) : (
          <Button onClick={() => setCurrentStep((s) => s + 1)} disabled={!stepComplete}>
            Continue
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Question Renderer ─────────────────────────────────────────────────────

function QuestionRenderer({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion
  value: unknown
  onChange: (value: unknown) => void
}) {
  switch (question.type) {
    case 'single_select':
      return (
        <RadioGroup
          label={question.label}
          options={(question.options || []).map((o) => ({ value: o, label: o }))}
          value={(value as string) || ''}
          onValueChange={onChange}
          required={question.required}
        />
      )

    case 'multi_select':
      return (
        <CheckboxGroup
          label={question.label}
          options={question.options || []}
          value={(value as string[]) || []}
          onValueChange={onChange}
          required={question.required}
        />
      )

    case 'textarea':
      return (
        <Textarea
          label={question.label}
          placeholder={question.placeholder || ''}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          required={question.required}
          rows={4}
        />
      )

    case 'rating_scale':
      return (
        <RatingScale
          label={question.label}
          value={value as number | null}
          onValueChange={onChange}
          min={question.min || 1}
          max={question.max || 5}
          minLabel={question.min_label}
          maxLabel={question.max_label}
          required={question.required}
        />
      )

    case 'nps':
      return (
        <RatingScale
          label={question.label}
          value={value as number | null}
          onValueChange={onChange}
          min={0}
          max={10}
          minLabel="Not at all likely"
          maxLabel="Extremely likely"
          required={question.required}
        />
      )

    case 'yes_no':
      return (
        <RadioGroup
          label={question.label}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
          value={(value as string) || ''}
          onValueChange={onChange}
          required={question.required}
        />
      )

    case 'number':
      return (
        <div className="w-full">
          <label className="block text-sm font-medium text-stone-300 mb-1.5">
            {question.label}
            {question.required && <span className="text-red-400 ml-1">*</span>}
          </label>
          <input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            min={question.min}
            max={question.max}
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      )

    default:
      return null
  }
}
