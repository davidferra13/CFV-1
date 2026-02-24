'use client'

import { useState } from 'react'
import { inviteClient, createClient } from '@/lib/clients/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function ClientInvitationForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ url: string; email: string } | null>(null)
  const [createOnly, setCreateOnly] = useState(false)
  const [createSuccess, setCreateSuccess] = useState<{ id: string; full_name: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const full_name = formData.get('full_name') as string

    try {
      if (createOnly) {
        const result = await createClient({ email, full_name })
        setCreateSuccess({ id: result.client.id, full_name: result.client.full_name })

        // Reset form
        e.currentTarget.reset()

        // Refresh to show new client
        router.refresh()
      } else {
        const result = await inviteClient({ email, full_name })
        setSuccess({ url: result.invitationUrl, email })

        // Reset form
        e.currentTarget.reset()

        // Refresh to show new invitation
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Invitation link copied to clipboard!')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            name="full_name"
            label="Client Name"
            placeholder="John Doe"
            required
            disabled={loading}
          />
          <Input
            name="email"
            type="email"
            label="Email Address"
            placeholder="client@example.com"
            required
            disabled={loading}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createOnly}
              onChange={(e) => setCreateOnly(e.currentTarget.checked)}
              className="form-checkbox"
              disabled={loading}
            />
            <span>Create client (no invitation)</span>
          </label>
          <Button type="submit" loading={loading}>
            {createOnly ? 'Create Client' : 'Send Invitation'}
          </Button>
        </div>
      </form>

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Invitation Sent!">
          <div className="space-y-2">
            <p className="text-sm">
              Invitation created for <strong>{success.email}</strong>
            </p>
            <div className="bg-stone-900 rounded border border-green-300 p-3">
              <p className="text-xs font-mono break-all text-stone-300">{success.url}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => copyToClipboard(success.url)}>
              Copy Link
            </Button>
            <p className="text-xs text-green-700 mt-2">
              Send this link to your client. It expires in 7 days.
            </p>
          </div>
        </Alert>
      )}

      {createSuccess && (
        <Alert variant="success" title="Client Created">
          <div className="space-y-2">
            <p className="text-sm">
              Client <strong>{createSuccess.full_name}</strong> created successfully.
            </p>
            <p className="text-xs text-stone-400">You can now manage this client from the list.</p>
          </div>
        </Alert>
      )}
    </div>
  )
}
