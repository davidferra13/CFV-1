'use client'

import { useState, FormEvent } from 'react'
import type { ContactSupportInfo } from '@/lib/contact/public-support'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { submitContactForm } from '@/lib/contact/actions'
import { ANALYTICS_EVENTS, trackEvent } from '@/lib/analytics/posthog'

interface FormData {
  name: string
  email: string
  subject: string
  message: string
}

interface FormErrors {
  name?: string
  email?: string
  message?: string
}

type ContactFormProps = {
  supportInfo: ContactSupportInfo
}

export default function ContactForm({ supportInfo }: ContactFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState(
    "We received your message. We'll reply soon."
  )
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required'
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await submitContactForm(formData)
      trackEvent(ANALYTICS_EVENTS.CONTACT_FORM_SUBMITTED, {
        source: 'contact_page',
        has_subject: Boolean(formData.subject.trim()),
        message_length: formData.message.trim().length,
      })

      setSuccessMessage(result.userMessage ?? "We received your message. We'll reply soon.")
      setShowSuccess(true)
      setFormData({ name: '', email: '', subject: '', message: '' })

      setTimeout(() => {
        setShowSuccess(false)
      }, 5000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      {/* Contact Form */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
          </CardHeader>
          <CardContent>
            {showSuccess && (
              <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-700/50 rounded-md">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-emerald-400 mt-0.5 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-emerald-200 mb-1">Message sent!</h4>
                    <p className="text-emerald-300 text-sm">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {submitError && (
              <div className="mb-6 p-4 bg-red-950/40 border border-red-700/50 rounded-md">
                <p className="text-red-300 text-sm">{submitError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                required
                placeholder="Your name"
              />

              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                required
                placeholder="your@email.com"
              />

              <Input
                label="Subject"
                name="subject"
                type="text"
                value={formData.subject}
                onChange={handleChange}
                placeholder="What is this about? (optional)"
              />

              <Textarea
                label="Message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                error={errors.message}
                required
                placeholder="Tell us how we can help..."
                rows={6}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                className="w-full bg-brand-500 hover:bg-brand-600 focus-visible:ring-brand-600"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Contact Info */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {supportInfo.statusLabel && (
              <div
                className={`rounded-lg border px-4 py-3 ${
                  supportInfo.isOpen
                    ? 'border-emerald-700/50 bg-emerald-950/30'
                    : 'border-amber-700/50 bg-amber-950/30'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-stone-100">Support Status</h4>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      supportInfo.isOpen ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {supportInfo.statusLabel}
                  </span>
                </div>
                {supportInfo.currentTimeLabel && (
                  <p className="mt-2 text-sm text-stone-400">
                    Current support time: {supportInfo.currentTimeLabel}
                  </p>
                )}
              </div>
            )}

            <div>
              <div className="flex items-start mb-4">
                <div className="w-10 h-10 bg-brand-950/40 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-brand-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-stone-100 mb-1">Email</h4>
                  <a
                    href={`mailto:${supportInfo.supportEmail}`}
                    className="text-brand-400 hover:text-brand-300"
                  >
                    {supportInfo.supportEmail}
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-700/60">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-brand-950/40 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-brand-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-stone-100 mb-1">Response Time</h4>
                  <p className="text-stone-400 text-sm">
                    {supportInfo.isOpen === true
                      ? 'We are currently online and usually respond as soon as possible.'
                      : 'We typically respond within 1 business day.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-700/60">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-emerald-950/40 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-stone-100 mb-1">Support Hours</h4>
                  <div className="space-y-1">
                    {supportInfo.hoursSummary.map((line) => (
                      <p
                        key={`${line.dayLabel}-${line.hoursLabel}`}
                        className="text-stone-400 text-sm"
                      >
                        {line.dayLabel}
                        <br />
                        {line.hoursLabel}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
