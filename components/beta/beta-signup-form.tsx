'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { submitBetaSignup } from '@/lib/beta/actions'

export function BetaSignupForm() {
  const router = useRouter()
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
    website: '', // honeypot
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const result = await submitBetaSignup(formData)

      if (result.success) {
        router.push('/beta/thank-you')
      } else {
        setStatus('error')
        setErrorMsg(result.error || 'Something went wrong.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Something went wrong. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot — hidden from real users, bots fill it */}
      <div className="absolute opacity-0 -z-10 pointer-events-none" aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={formData.website}
          onChange={handleChange}
        />
      </div>

      {/* Required fields */}
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
        placeholder="your@email.com"
        value={formData.email}
        onChange={handleChange}
      />

      {/* Optional fields */}
      <Input
        label="Phone"
        name="phone"
        type="tel"
        placeholder="(optional)"
        value={formData.phone}
        onChange={handleChange}
      />
      <Input
        label="Business Name"
        name="businessName"
        placeholder="(optional)"
        value={formData.businessName}
        onChange={handleChange}
      />
      <Input
        label="Cuisine Type"
        name="cuisineType"
        placeholder="e.g., Italian, Farm-to-table, Pastry (optional)"
        value={formData.cuisineType}
        onChange={handleChange}
      />
      <Input
        label="Years in Business"
        name="yearsInBusiness"
        placeholder="e.g., 3, 10+, Just starting (optional)"
        value={formData.yearsInBusiness}
        onChange={handleChange}
      />

      {/* Referral source */}
      <div className="w-full">
        <label className="block text-sm font-medium text-stone-300 mb-1.5">
          How did you hear about ChefFlow?
        </label>
        <select
          name="referralSource"
          value={formData.referralSource}
          onChange={handleChange}
          className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="">(optional)</option>
          <option value="social_media">Social Media</option>
          <option value="friend_referral">Friend / Colleague</option>
          <option value="google_search">Google Search</option>
          <option value="chef_community">Chef Community / Forum</option>
          <option value="event">Event / Conference</option>
          <option value="other">Other</option>
        </select>
      </div>

      {status === 'error' && <p className="text-sm text-red-400">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
      >
        {status === 'loading' ? 'Joining...' : 'Join the Beta'}
      </button>
    </form>
  )
}
