'use client'

import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'
import { submitBetaSignup } from '@/lib/beta/actions'

export function BetaSignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sourcePage = searchParams?.get('source_page')?.trim() || 'beta'
  const sourceCta = searchParams?.get('source_cta')?.trim() || undefined

  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    cuisineType: '',
    yearsInBusiness: '',
    referralSource: '',
    website: '',
  })

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    trackEvent(ANALYTICS_EVENTS.SIGNUP_STARTED, {
      role: 'chef',
      method: 'email',
      source: 'beta_waitlist',
      source_page: sourcePage,
      source_cta: sourceCta || null,
      has_business_name: Boolean(formData.businessName.trim()),
      has_phone: Boolean(formData.phone.trim()),
    })

    try {
      const result = await submitBetaSignup({
        ...formData,
        sourcePage,
        sourceCta,
      })

      if (result.success) {
        trackEvent(ANALYTICS_EVENTS.BETA_SIGNUP_SUBMITTED, {
          referral_source: formData.referralSource || 'unknown',
          source_page: sourcePage,
          source_cta: sourceCta || null,
          has_business_name: Boolean(formData.businessName.trim()),
          has_phone: Boolean(formData.phone.trim()),
        })
        router.push('/beta/thank-you')
        return
      }

      setStatus('error')
      setErrorMsg(result.error || 'Something went wrong.')
    } catch {
      setStatus('error')
      setErrorMsg('Something went wrong. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="absolute -z-10 opacity-0 pointer-events-none" aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={formData.website}
          onChange={handleChange}
        />
      </div>

      <div className="grid gap-5">
        <Input
          label="Name"
          name="name"
          required
          placeholder="Your full name"
          value={formData.name}
          onChange={handleChange}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          helperText="We will use this for beta onboarding updates."
        />
      </div>

      <details className="rounded-2xl border border-stone-700 bg-stone-950/60 p-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-stone-100">
          Optional operator details
        </summary>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          Add this now if you want us to tailor onboarding to your current operation.
        </p>

        <div className="mt-4 space-y-5">
          <Input
            label="Phone"
            name="phone"
            type="tel"
            placeholder="Optional"
            value={formData.phone}
            onChange={handleChange}
          />
          <Input
            label="Business Name"
            name="businessName"
            placeholder="Optional"
            value={formData.businessName}
            onChange={handleChange}
          />
          <Input
            label="Cuisine Type"
            name="cuisineType"
            placeholder="Italian, tasting menus, meal prep, pastry"
            value={formData.cuisineType}
            onChange={handleChange}
          />
          <Input
            label="Years in Business"
            name="yearsInBusiness"
            placeholder="Optional"
            value={formData.yearsInBusiness}
            onChange={handleChange}
          />

          <div className="w-full">
            <label
              htmlFor="referral-source"
              className="mb-1.5 block text-sm font-medium text-stone-300"
            >
              How did you hear about ChefFlow?
            </label>
            <select
              id="referral-source"
              name="referralSource"
              value={formData.referralSource}
              onChange={handleChange}
              className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">Optional</option>
              <option value="social_media">Social Media</option>
              <option value="friend_referral">Friend / Colleague</option>
              <option value="google_search">Google Search</option>
              <option value="chef_community">Chef Community / Forum</option>
              <option value="event">Event / Conference</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </details>

      {status === 'error' && <p className="text-sm text-red-400">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {status === 'loading' ? 'Requesting access...' : 'Request early access'}
      </button>
    </form>
  )
}
