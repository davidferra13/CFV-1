/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, useEffect, useRef, FormEvent, useCallback } from 'react'
import { validateEmailLocal, suggestEmailCorrection } from '@/lib/email/email-validator'
import { TurnstileWidget } from '@/components/security/turnstile-widget'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'

interface Props {
  chefId: string
  chefName: string
  profileImageUrl: string | null
  accentColor: string
  theme: 'light' | 'dark'
}

interface FormData {
  full_name: string
  email: string
  phone: string
  address: string
  month: string
  day: string
  year: string
  serve_time: string
  guest_count: string
  occasion: string
  budget_range: string
  budget_exact_amount: string
  allergy_flag: string
  allergies_food_restrictions: string
  favorite_ingredients_dislikes: string
  additional_notes: string
  website_url: string // honeypot
}

interface FormErrors {
  [key: string]: string | undefined
}

const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

const BUDGET_OPTIONS = [
  { value: 'under_500', label: 'Under $500' },
  { value: '500_1500', label: '$500 - $1,500' },
  { value: '1500_3000', label: '$1,500 - $3,000' },
  { value: '3000_5000', label: '$3,000 - $5,000' },
  { value: 'over_5000', label: '$5,000+' },
  { value: 'not_sure', label: 'Not sure yet' },
]

const GUEST_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  { value: '10', label: '10' },
  { value: '12', label: '12' },
  { value: '15', label: '15' },
  { value: '20', label: '20+' },
]

const ALLERGY_OPTIONS = [
  { value: 'none', label: 'No known allergies' },
  { value: 'yes', label: "Yes - I'll describe below" },
  { value: 'unknown', label: 'Not sure yet' },
]

function getBudgetMode(
  budgetRange: string,
  budgetExactAmount: string
): 'exact' | 'range' | 'not_sure' | 'unset' {
  if (budgetExactAmount.trim()) return 'exact'
  if (budgetRange === 'not_sure') return 'not_sure'
  if (budgetRange) return 'range'
  return 'unset'
}

// Determine the API origin - works in both dev and production
function getApiOrigin(): string {
  if (typeof window !== 'undefined') {
    // In an iframe, we get the origin from the page's own URL
    return window.location.origin
  }
  return ''
}

export function EmbedInquiryForm({ chefId, chefName, profileImageUrl, accentColor, theme }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-resize: notify parent iframe of height changes
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return

    const sendHeight = () => {
      const height = containerRef.current?.scrollHeight || document.body.scrollHeight
      window.parent.postMessage({ type: 'chefflow-widget-resize', height: height + 32 }, '*')
    }

    // Send initial height after render
    sendHeight()

    // Observe DOM changes (e.g. allergy field appearing, errors showing)
    const observer = new MutationObserver(sendHeight)
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true, attributes: true })
    }

    // Also send on window resize
    window.addEventListener('resize', sendHeight)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', sendHeight)
    }
  }, [])

  const isDark = theme === 'dark'
  const textPrimary = isDark ? '#fafaf9' : '#1c1917'
  const textSecondary = isDark ? '#a8a29e' : '#78716c'
  const bgCard = isDark ? '#292524' : '#ffffff'
  const bgInput = isDark ? '#1c1917' : '#ffffff'
  const borderColor = isDark ? '#44403c' : '#e7e5e4'
  const errorColor = '#ef4444'

  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    month: '',
    day: '',
    year: '',
    serve_time: '',
    guest_count: '',
    occasion: '',
    budget_range: '',
    budget_exact_amount: '',
    allergy_flag: '',
    allergies_food_restrictions: '',
    favorite_ingredients_dislikes: '',
    additional_notes: '',
    website_url: '', // honeypot - hidden from users
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const handleEmailBlur = useCallback(() => {
    const email = formData.email.trim()
    if (!email) {
      setEmailSuggestion(null)
      return
    }

    // Check for typo suggestion first
    const suggestion = suggestEmailCorrection(email)
    if (suggestion) {
      setEmailSuggestion(suggestion)
      return
    }

    // Run local validation
    const result = validateEmailLocal(email)
    if (!result.isValid) {
      setErrors((prev) => ({ ...prev, email: result.reason || 'Invalid email' }))
    }
    setEmailSuggestion(null)
  }, [formData.email])

  const validate = (): boolean => {
    const errs: FormErrors = {}

    if (!formData.full_name.trim()) errs.full_name = 'Name is required'
    if (!formData.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Invalid email'

    if (!formData.month) errs.month = 'Required'
    if (!formData.day.trim()) errs.day = 'Required'
    if (!formData.year.trim()) errs.year = 'Required'

    const dayNum = Number(formData.day)
    const yearNum = Number(formData.year)
    if (formData.day && (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > 31))
      errs.day = 'Invalid'
    if (formData.year && (!Number.isInteger(yearNum) || yearNum < 2025 || yearNum > 2100))
      errs.year = 'Invalid'

    if (!formData.serve_time.trim()) errs.serve_time = 'Required'
    else if (!/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i.test(formData.serve_time.trim()))
      errs.serve_time = 'Use HH:MM AM/PM'

    if (!formData.guest_count) errs.guest_count = 'Required'
    if (!formData.occasion.trim()) errs.occasion = 'Required'
    if (!formData.budget_range) errs.budget_range = 'Required'
    if (formData.budget_exact_amount.trim()) {
      const parsedBudget = Number(formData.budget_exact_amount)
      if (!Number.isFinite(parsedBudget) || parsedBudget < 0)
        errs.budget_exact_amount = 'Enter a valid amount'
    }
    if (!formData.allergy_flag) errs.allergy_flag = 'Required'
    if (formData.allergy_flag === 'yes' && !formData.allergies_food_restrictions.trim())
      errs.allergies_food_restrictions = 'Please describe your allergies'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const month = Number(formData.month)
      const day = Number(formData.day)
      const year = Number(formData.year)
      const eventDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const budgetCents = formData.budget_exact_amount.trim()
        ? Math.round(Number(formData.budget_exact_amount) * 100)
        : null
      const budgetMode = getBudgetMode(formData.budget_range, formData.budget_exact_amount)

      const apiOrigin = getApiOrigin()
      const res = await fetch(`${apiOrigin}/api/embed/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chef_id: chefId,
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          event_date: eventDate,
          serve_time: formData.serve_time.trim().toUpperCase(),
          guest_count: parseInt(formData.guest_count, 10),
          occasion: formData.occasion.trim(),
          budget_cents: budgetCents,
          budget_range: formData.budget_range || undefined,
          allergy_flag: formData.allergy_flag || undefined,
          allergies_food_restrictions: formData.allergies_food_restrictions.trim(),
          favorite_ingredients_dislikes: formData.favorite_ingredients_dislikes.trim(),
          additional_notes: formData.additional_notes.trim(),
          website_url: formData.website_url, // honeypot
          turnstile_token: turnstileToken || undefined, // Cloudflare Turnstile CAPTCHA
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        // If server returned an email suggestion, show it inline instead of a generic error
        if (result.emailSuggestion) {
          setEmailSuggestion(result.emailSuggestion)
          setErrors((prev) => ({ ...prev, email: result.error }))
          setIsSubmitting(false)
          return
        }
        throw new Error(result.error || 'Submission failed')
      }

      trackEvent(ANALYTICS_EVENTS.INQUIRY_SUBMITTED, {
        source: 'embed_widget',
        budget_mode: budgetMode,
        budget_range: formData.budget_range || null,
        budget_exact_entered: budgetCents != null,
        guest_count: parseInt(formData.guest_count, 10),
      })

      setShowSuccess(true)

      // Notify parent window (for embed script to resize/respond)
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'chefflow-inquiry-submitted' }, '*')
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  // Inline styles (self-contained - no external CSS dependencies)
  const cardStyle: React.CSSProperties = {
    backgroundColor: bgCard,
    borderRadius: '16px',
    border: `1px solid ${borderColor}`,
    padding: '24px',
    maxWidth: '560px',
    margin: '0 auto',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: textPrimary,
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: `1px solid ${borderColor}`,
    backgroundColor: bgInput,
    color: textPrimary,
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: textSecondary,
    marginBottom: '4px',
  }

  const errorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: errorColor,
    marginTop: '2px',
  }

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: accentColor,
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: isSubmitting ? 'wait' : 'pointer',
    opacity: isSubmitting ? 0.7 : 1,
    transition: 'opacity 0.15s',
  }

  if (showSuccess) {
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }}>
            Inquiry Submitted!
          </h2>
          <p style={{ color: textSecondary, margin: '0 0 24px', lineHeight: 1.5 }}>
            Thank you for your interest. {chefName} will review your inquiry and get back to you
            within 24 hours.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowSuccess(false)
              setFormData({
                full_name: '',
                email: '',
                phone: '',
                address: '',
                month: '',
                day: '',
                year: '',
                serve_time: '',
                guest_count: '',
                occasion: '',
                budget_range: '',
                budget_exact_amount: '',
                allergy_flag: '',
                allergies_food_restrictions: '',
                favorite_ingredients_dislikes: '',
                additional_notes: '',
                website_url: '',
              })
            }}
            style={{
              color: accentColor,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Submit another inquiry
          </button>
          <div style={{ marginTop: '24px', fontSize: '11px', color: textSecondary, opacity: 0.6 }}>
            Powered by{' '}
            <a
              href="https://cheflowhq.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: accentColor, textDecoration: 'none' }}
            >
              ChefFlow
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={cardStyle}>
      {submitError && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: isDark ? '#451a1a' : '#fef2f2',
            border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`,
          }}
        >
          <p style={{ color: errorColor, fontSize: '13px', margin: 0 }}>{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          {profileImageUrl && (
            <img
              src={profileImageUrl}
              alt={chefName}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                objectFit: 'cover',
                margin: '0 auto 12px',
                display: 'block',
                border: `2px solid ${accentColor}`,
              }}
            />
          )}
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Book {chefName}</h2>
          <p style={{ color: textSecondary, fontSize: '14px', margin: 0 }}>
            Fill out the details below and we&apos;ll be in touch.
          </p>
        </div>

        {/* Honeypot - hidden from real users, bots fill it */}
        <div
          style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}
          aria-hidden="true"
        >
          <input
            type="text"
            name="website_url"
            value={formData.website_url}
            onChange={handleChange}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input
              style={inputStyle}
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Full Name"
            />
            {errors.full_name && <p style={errorStyle}>{errors.full_name}</p>}
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email *</label>
            <input
              style={inputStyle}
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                handleChange(e)
                if (emailSuggestion) setEmailSuggestion(null)
              }}
              onBlur={handleEmailBlur}
              placeholder="your@email.com"
            />
            {errors.email && <p style={errorStyle}>{errors.email}</p>}
            {emailSuggestion && (
              <p style={{ fontSize: '12px', color: '#d97706', marginTop: '2px' }}>
                Did you mean{' '}
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, email: emailSuggestion }))
                    setEmailSuggestion(null)
                    setErrors((prev) => ({ ...prev, email: undefined }))
                  }}
                  style={{
                    color: accentColor,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '12px',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  {emailSuggestion}
                </button>
                ?
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label style={labelStyle}>Phone</label>
            <input
              style={inputStyle}
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(optional)"
            />
          </div>

          {/* Address */}
          <div>
            <label style={labelStyle}>Event Address</label>
            <input
              style={inputStyle}
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Street, City, State, ZIP"
            />
          </div>

          {/* Date & Time */}
          <div>
            <label style={labelStyle}>Event Date & Serve Time *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
              <select
                style={inputStyle}
                name="month"
                value={formData.month}
                onChange={handleChange}
                aria-label="Month"
              >
                <option value="">Month</option>
                {MONTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                style={inputStyle}
                name="day"
                value={formData.day}
                onChange={handleChange}
                placeholder="Day"
                inputMode="numeric"
                maxLength={2}
              />
              <input
                style={inputStyle}
                name="year"
                value={formData.year}
                onChange={handleChange}
                placeholder="Year"
                inputMode="numeric"
                maxLength={4}
              />
              <input
                style={inputStyle}
                name="serve_time"
                value={formData.serve_time}
                onChange={handleChange}
                placeholder="6:00 PM"
              />
            </div>
            {(errors.month || errors.day || errors.year || errors.serve_time) && (
              <p style={errorStyle}>
                {errors.month || errors.day || errors.year || errors.serve_time}
              </p>
            )}
            <p style={{ fontSize: '12px', color: '#d97706', marginTop: '4px' }}>
              Chef will arrive 2hr prior to serve time.
            </p>
          </div>

          {/* Guest Count & Occasion */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Guests *</label>
              <select
                style={inputStyle}
                name="guest_count"
                value={formData.guest_count}
                onChange={handleChange}
                aria-label="Guest count"
              >
                <option value="">Select</option>
                {GUEST_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {errors.guest_count && <p style={errorStyle}>{errors.guest_count}</p>}
            </div>
            <div>
              <label style={labelStyle}>Occasion *</label>
              <input
                style={inputStyle}
                name="occasion"
                value={formData.occasion}
                onChange={handleChange}
                placeholder="e.g. Birthday"
              />
              {errors.occasion && <p style={errorStyle}>{errors.occasion}</p>}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label style={labelStyle}>Budget *</label>
            <select
              style={inputStyle}
              name="budget_range"
              value={formData.budget_range}
              onChange={handleChange}
              aria-label="Budget range"
            >
              <option value="">Select range</option>
              {BUDGET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errors.budget_range && <p style={errorStyle}>{errors.budget_range}</p>}
            <div style={{ marginTop: '8px' }}>
              <label style={labelStyle}>Exact Budget (optional)</label>
              <input
                style={inputStyle}
                name="budget_exact_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.budget_exact_amount}
                onChange={handleChange}
                aria-label="Exact budget amount"
                placeholder="e.g. 1800"
              />
              {errors.budget_exact_amount && <p style={errorStyle}>{errors.budget_exact_amount}</p>}
            </div>
          </div>

          {/* Favorites/Dislikes */}
          <div>
            <label style={labelStyle}>Favorite ingredients or strong dislikes?</label>
            <textarea
              style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
              name="favorite_ingredients_dislikes"
              value={formData.favorite_ingredients_dislikes}
              onChange={handleChange}
              placeholder="Tell us what you love or can't stand"
            />
          </div>

          {/* Allergies */}
          <div>
            <label style={labelStyle}>Allergies or Dietary Restrictions? *</label>
            <select
              style={inputStyle}
              name="allergy_flag"
              value={formData.allergy_flag}
              onChange={handleChange}
              aria-label="Allergy status"
            >
              <option value="">Select</option>
              {ALLERGY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errors.allergy_flag && <p style={errorStyle}>{errors.allergy_flag}</p>}
          </div>

          {formData.allergy_flag === 'yes' && (
            <div>
              <label style={labelStyle}>Please describe your allergies or restrictions *</label>
              <textarea
                style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
                name="allergies_food_restrictions"
                value={formData.allergies_food_restrictions}
                onChange={handleChange}
                placeholder="e.g. Shellfish allergy, gluten-free, vegan"
              />
              {errors.allergies_food_restrictions && (
                <p style={errorStyle}>{errors.allergies_food_restrictions}</p>
              )}
            </div>
          )}

          {/* Additional Notes */}
          <div>
            <label style={labelStyle}>Additional Notes</label>
            <textarea
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
              name="additional_notes"
              value={formData.additional_notes}
              onChange={handleChange}
              placeholder="Anything else you'd like us to know?"
            />
          </div>

          {/* Invisible Turnstile CAPTCHA - renders nothing visible */}
          <TurnstileWidget
            onVerify={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
            theme={isDark ? 'dark' : 'light'}
          />

          {/* Submit */}
          <button type="submit" style={buttonStyle} disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Inquiry'}
          </button>

          <p style={{ fontSize: '11px', color: textSecondary, textAlign: 'center', margin: 0 }}>
            By submitting, you agree to be contacted about your inquiry.
          </p>

          {/* Powered by ChefFlow */}
          <div
            style={{
              textAlign: 'center',
              fontSize: '11px',
              color: textSecondary,
              opacity: 0.6,
              marginTop: '4px',
            }}
          >
            Powered by{' '}
            <a
              href="https://cheflowhq.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: accentColor, textDecoration: 'none' }}
            >
              ChefFlow
            </a>
          </div>
        </div>
      </form>
    </div>
  )
}
