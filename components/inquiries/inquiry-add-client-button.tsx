'use client'

// Inline "Add as Client" button for the inquiry detail page.
// Shown when inquiry has no linked client record.
// Reveals a small form; on submit creates the client and links the inquiry.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { addClientFromInquiry } from '@/lib/clients/actions'

type Props = {
  inquiryId: string
  prefillName?: string
  prefillEmail?: string
  prefillPhone?: string
}

export function InquiryAddClientButton({
  inquiryId,
  prefillName,
  prefillEmail,
  prefillPhone,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState(prefillName ?? '')
  const [email, setEmail] = useState(prefillEmail ?? '')
  const [phone, setPhone] = useState(prefillPhone ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await addClientFromInquiry({ full_name: fullName, email, phone, inquiryId })
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error)
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        + Add as Client
      </Button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-3 rounded-lg border border-stone-700 bg-stone-800 p-4"
    >
      <p className="text-xs font-semibold text-stone-300 uppercase tracking-wide">
        Create Client Record
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <label htmlFor="add-client-name" className="block text-xs font-medium text-stone-400 mb-1">
          Full Name *
        </label>
        <input
          id="add-client-name"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Smith"
          className="w-full text-sm border border-stone-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label htmlFor="add-client-email" className="block text-xs font-medium text-stone-400 mb-1">
          Email *
        </label>
        <input
          id="add-client-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          className="w-full text-sm border border-stone-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label htmlFor="add-client-phone" className="block text-xs font-medium text-stone-400 mb-1">
          Phone
        </label>
        <input
          id="add-client-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 000-0000"
          className="w-full text-sm border border-stone-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={loading}>
          {loading ? 'Saving...' : 'Create & Link'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
