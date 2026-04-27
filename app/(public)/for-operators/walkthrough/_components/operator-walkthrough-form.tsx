'use client'

import { type ChangeEvent, type FormEvent, useMemo, useState } from 'react'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'
import { submitContactForm } from '@/lib/contact/actions'
import { CONTACT_INTAKE_LANES } from '@/lib/contact/operator-evaluation'

const OPERATOR_TYPE_OPTIONS = [
  { value: 'private_chef', label: 'Private chef' },
  { value: 'catering', label: 'Caterer or small event team' },
  { value: 'meal_prep', label: 'Meal prep or recurring service' },
  { value: 'marketplace_first', label: 'Marketplace-first private chef' },
  { value: 'chef_led_team', label: 'Chef-led hospitality business' },
  { value: 'other', label: 'Other small culinary operator' },
] as const

type OperatorTypeValue = (typeof OPERATOR_TYPE_OPTIONS)[number]['value']

type FormData = {
  name: string
  email: string
  businessName: string
  operatorType: OperatorTypeValue | ''
  workflowStack: string
  helpRequest: string
  website: string
}

type FormErrors = {
  name?: string
  email?: string
  businessName?: string
  operatorType?: string
  workflowStack?: string
  helpRequest?: string
}

type OperatorWalkthroughFormProps = {
  sourceCta?: string
  sourcePage?: string
}

const EMPTY_FORM: FormData = {
  name: '',
  email: '',
  businessName: '',
  operatorType: '',
  workflowStack: '',
  helpRequest: '',
  website: '',
}

function getOperatorTypeLabel(value: OperatorTypeValue | '') {
  return OPERATOR_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? 'Unspecified'
}

function buildSubmissionSubject(data: FormData) {
  const subjectParts = ['Operator walkthrough request', data.businessName.trim()]
  const operatorTypeLabel = getOperatorTypeLabel(data.operatorType)

  if (operatorTypeLabel !== 'Unspecified') {
    subjectParts.push(operatorTypeLabel)
  }

  return subjectParts.filter(Boolean).join(' - ')
}

function buildSubmissionMessage(
  data: FormData,
  { sourceCta, sourcePage }: Pick<OperatorWalkthroughFormProps, 'sourceCta' | 'sourcePage'>
) {
  return [
    'Operator walkthrough request',
    '',
    `Business name: ${data.businessName.trim()}`,
    `Operator type: ${getOperatorTypeLabel(data.operatorType)}`,
    '',
    'Current workflow or tool stack:',
    data.workflowStack.trim(),
    '',
    'What they want help with:',
    data.helpRequest.trim(),
    '',
    `Source page: ${sourcePage?.trim() || 'direct'}`,
    `Source CTA: ${sourceCta?.trim() || 'direct'}`,
  ].join('\n')
}

export function OperatorWalkthroughForm({ sourceCta, sourcePage }: OperatorWalkthroughFormProps) {
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const sourceLabel = useMemo(() => {
    if (!sourcePage) return null
    return sourcePage.replace(/_/g, ' ')
  }, [sourcePage])

  const validateForm = () => {
    const nextErrors: FormErrors = {}

    if (!formData.name.trim()) {
      nextErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Please enter a valid email address'
    }

    if (!formData.businessName.trim()) {
      nextErrors.businessName = 'Business name is required'
    }

    if (!formData.operatorType) {
      nextErrors.operatorType = 'Choose the closest service model'
    }

    if (!formData.workflowStack.trim()) {
      nextErrors.workflowStack = 'Add a short note on your current workflow or stack'
    } else if (formData.workflowStack.trim().length < 8) {
      nextErrors.workflowStack = 'Add a little more detail so the walkthrough can be qualified'
    }

    if (!formData.helpRequest.trim()) {
      nextErrors.helpRequest = 'Tell us what you want the walkthrough to focus on'
    } else if (formData.helpRequest.trim().length < 12) {
      nextErrors.helpRequest = 'Add a little more detail about the help you want'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    if (errors[name as keyof FormErrors]) {
      setErrors((current) => ({ ...current, [name]: undefined }))
    }
  }

  const handleOperatorTypeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as FormData['operatorType']

    setFormData((current) => ({
      ...current,
      operatorType: value,
    }))

    if (errors.operatorType) {
      setErrors((current) => ({ ...current, operatorType: undefined }))
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await submitContactForm({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: buildSubmissionSubject(formData),
        message: buildSubmissionMessage(formData, { sourceCta, sourcePage }),
        intakeLane: CONTACT_INTAKE_LANES.OPERATOR_WALKTHROUGH,
        sourceCta,
        sourcePage,
        website: formData.website,
      })

      trackEvent(ANALYTICS_EVENTS.CONTACT_FORM_SUBMITTED, {
        source: 'operator_walkthrough',
        operator_type: formData.operatorType,
        source_page: sourcePage ?? null,
        source_cta: sourceCta ?? null,
      })

      setSuccessMessage(
        result.userMessage ??
          "We received your walkthrough request. We'll reply by email with the next step."
      )
      setFormData(EMPTY_FORM)
      setErrors({})
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (successMessage) {
    return (
      <div className="rounded-[1.75rem] border border-emerald-700/40 bg-emerald-950/20 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
          Request received
        </p>
        <h3 className="mt-3 text-2xl font-display tracking-[-0.04em] text-stone-100">
          The workflow context is in.
        </h3>
        <p className="mt-4 text-sm leading-7 text-emerald-100/90">{successMessage}</p>
        <p className="mt-4 text-sm leading-7 text-stone-300">
          Next step: the request gets reviewed against your current workflow. If the fit is clear,
          the reply will either suggest a walkthrough angle or ask one or two short questions before
          scheduling anything.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <TrackedLink
            href="/for-operators"
            analyticsName="operator_walkthrough_success_proof"
            analyticsProps={{ source_page: sourcePage ?? null }}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Review operator proof
          </TrackedLink>
          <button
            type="button"
            onClick={() => {
              setSuccessMessage(null)
              setSubmitError(null)
            }}
            className="inline-flex items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
          >
            Submit another request
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <input
        type="text"
        name="website"
        value={formData.website}
        onChange={handleInputChange}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {sourceLabel ? (
        <div className="rounded-2xl border border-stone-700/60 bg-stone-950/60 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.12em] text-stone-500">Source context</p>
          <p className="mt-1 text-sm text-stone-300">
            This request will carry the context from{' '}
            <span className="text-stone-100">{sourceLabel}</span>.
          </p>
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-lg border border-red-700/50 bg-red-950/30 px-4 py-3">
          <p className="text-sm text-red-300">{submitError}</p>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleInputChange}
          error={errors.name}
          required
          autoComplete="name"
          placeholder="Your name"
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          error={errors.email}
          required
          autoComplete="email"
          placeholder="you@business.com"
        />
      </div>

      <Input
        label="Business name"
        name="businessName"
        type="text"
        value={formData.businessName}
        onChange={handleInputChange}
        error={errors.businessName}
        required
        autoComplete="organization"
        placeholder="Your business or brand"
      />

      <div>
        <label htmlFor="operator-type" className="mb-1.5 block text-sm font-medium text-stone-300">
          Operator type / service model
          <span className="ml-1 text-red-500">*</span>
        </label>
        <select
          id="operator-type"
          name="operatorType"
          value={formData.operatorType}
          onChange={handleOperatorTypeChange}
          className={`block w-full rounded-lg border bg-stone-900 px-3 py-2 text-sm text-stone-100 transition-[border-color,box-shadow,background-color] duration-200 ease-out focus:outline-none focus:ring-2 ${
            errors.operatorType
              ? 'border-red-400 focus:border-red-400 focus:ring-red-500/20'
              : 'border-stone-600 focus:border-brand-500 focus:ring-brand-500/20'
          }`}
          aria-invalid={errors.operatorType ? 'true' : 'false'}
          required
        >
          <option value="">Choose the closest fit</option>
          {OPERATOR_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.operatorType ? (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.operatorType}
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-stone-400">
            This helps keep the walkthrough matched to the right workflow shape.
          </p>
        )}
      </div>

      <Textarea
        label="Current workflow or tool stack"
        name="workflowStack"
        value={formData.workflowStack}
        onChange={handleInputChange}
        error={errors.workflowStack}
        required
        placeholder="Example: Google Sheets, QuickBooks, HoneyBook, inbox threads, paper prep notes..."
        rows={4}
      />

      <Textarea
        label="What do you want help with?"
        name="helpRequest"
        value={formData.helpRequest}
        onChange={handleInputChange}
        error={errors.helpRequest}
        required
        placeholder="Tell us what should get pressure-tested: inquiries, event handoffs, staffing, menu approvals, payments, margin visibility, repeat workflows..."
        rows={5}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isSubmitting}
        className="w-full bg-brand-500 hover:bg-brand-600 focus-visible:ring-brand-600"
      >
        {isSubmitting ? 'Submitting request...' : 'Request operator walkthrough'}
      </Button>

      <p className="text-sm leading-6 text-stone-400">
        No instant calendar booking is shown here. Requests are reviewed first so the next step
        matches the actual workflow you are evaluating.
      </p>
    </form>
  )
}
