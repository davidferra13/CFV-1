'use client'

import { useState, FormEvent } from 'react'
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
  website: string
}

interface FormErrors {
  name?: string
  email?: string
  message?: string
}

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
    website: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Validate message
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
      await submitContactForm(formData)

      setShowSuccess(true)
      setFormData({ name: '', email: '', subject: '', message: '', website: '' })
      trackEvent(ANALYTICS_EVENTS.CONTACT_FORM_SUBMITTED, { source: 'public_contact_page' })

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

    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  return (
    <div>
      {/* Page Header */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-stone-100 mb-4">
            Questions? Let's talk.
          </h1>
          <p className="text-lg md:text-xl text-stone-300">
            I'm David, the chef who built ChefFlow. Ask me anything about the product, pricing, or
            how it fits your workflow.
          </p>
        </div>
      </section>

      {/* Contact Form and Info */}
      <section className="container mx-auto px-4 pb-16 md:pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Send a message</CardTitle>
                </CardHeader>
                <CardContent>
                  {showSuccess && (
                    <div className="mb-6 p-4 bg-green-950 border border-green-200 rounded-md">
                      <div className="flex items-start">
                        <svg
                          className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
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
                          <h4 className="font-semibold text-green-900 mb-1">Message sent!</h4>
                          <p className="text-green-700 text-sm">I&apos;ll get back to you soon.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {submitError && (
                    <div className="mb-6 p-4 bg-red-950 border border-red-200 rounded-md">
                      <p className="text-red-700 text-sm">{submitError}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="relative space-y-6">
                    <div
                      className="absolute opacity-0 -z-10 pointer-events-none"
                      aria-hidden="true"
                    >
                      <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={formData.website}
                        onChange={handleChange}
                      />
                    </div>
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
                  <CardTitle>Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-start mb-4">
                      <div className="w-10 h-10 bg-brand-900 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-brand-600"
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
                          href="mailto:support@cheflowhq.com"
                          className="text-brand-600 hover:text-brand-400"
                        >
                          support@cheflowhq.com
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-stone-700">
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-brand-900 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-brand-600"
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
                        <h4 className="font-semibold text-stone-100 mb-1">Response time</h4>
                        <p className="text-stone-300 text-sm">
                          I usually reply the same day. If I'm cooking, next morning at the latest.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-stone-700">
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-green-900 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
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
                        <h4 className="font-semibold text-stone-100 mb-1">Support hours</h4>
                        <p className="text-stone-300 text-sm">
                          Monday to Friday
                          <br />
                          9:00 AM to 5:00 PM PT
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
