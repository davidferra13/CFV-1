'use client'

// Create Staff Login Form
// Allows a chef to create a portal login for a staff member.
// Shows a success state or "Portal Access Active" badge if login already exists.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createStaffLogin } from '@/lib/staff/actions'

type Props = {
  staffMemberId: string
  currentEmail?: string | null
  hasLogin?: boolean
}

export function CreateStaffLoginForm({ staffMemberId, currentEmail, hasLogin }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState(currentEmail ?? '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // If login already exists, show active badge
  if (hasLogin || success) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Badge variant="success">Portal Access Active</Badge>
        </div>
        {success && (
          <div className="rounded-lg border border-emerald-800 bg-emerald-950/50 p-4">
            <p className="text-sm text-emerald-300 font-medium">Login created successfully!</p>
            <p className="text-sm text-stone-400 mt-1">
              Staff member can now sign in at{' '}
              <span className="text-stone-200 font-mono text-xs">/staff-login</span>
            </p>
          </div>
        )}
        {!success && (
          <p className="text-sm text-stone-400">
            This staff member already has portal access. They can sign in at{' '}
            <span className="text-stone-200 font-mono text-xs">/staff-login</span>
          </p>
        )}
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await createStaffLogin({
        staffMemberId,
        email: email.trim(),
        password,
      })
      setSuccess(true)
      router.refresh()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create login. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-stone-400">
        Create a login so this staff member can access the staff portal — view schedules, tasks,
        recipes, and station clipboards.
      </p>

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="staff@example.com"
        required
      />

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Minimum 8 characters"
        required
        minLength={8}
      />

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 p-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <Button type="submit" variant="primary" loading={loading} disabled={loading}>
        {loading ? 'Creating Login...' : 'Create Login'}
      </Button>
    </form>
  )
}
