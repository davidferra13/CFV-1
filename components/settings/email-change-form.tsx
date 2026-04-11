'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { requestEmailChange } from '@/lib/auth/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { toast } from 'sonner'

export function EmailChangeForm({ currentEmail }: { currentEmail: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.trim() || newEmail === currentEmail) return

    startTransition(async () => {
      try {
        await requestEmailChange(newEmail.trim())
        setSent(true)
        toast.success('Verification email sent')
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to send verification email')
      }
    })
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-sm text-stone-400">Current email:</p>
          <p className="text-sm font-medium text-stone-100">{currentEmail}</p>
        </div>
        <Alert variant="info">
          Check <strong>{newEmail}</strong> for a verification link. Your email will not change
          until you click that link. The link expires in 1 hour.
        </Alert>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSent(false)
            setEditing(false)
            setNewEmail('')
          }}
        >
          Cancel
        </Button>
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-400">Email address</p>
          <p className="text-sm font-medium text-stone-100">{currentEmail}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Change
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <p className="text-sm text-stone-400 mb-1">Current: {currentEmail}</p>
        <Input
          type="email"
          placeholder="New email address"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          required
          autoFocus
          disabled={isPending}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" type="submit" loading={isPending}>
          Send Verification
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => {
            setEditing(false)
            setNewEmail('')
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
