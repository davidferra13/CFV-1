// Change Password Form - Client Component
// Validates inputs and calls server action to update password

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { changePassword } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

export function ChangePasswordForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Client-side validation
    if (newPassword.length < 12) {
      setError('New password must be at least 12 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    startTransition(async () => {
      try {
        await changePassword(currentPassword, newPassword)
        setSuccess(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        // Server signs out the session after password change for security.
        // Redirect to sign-in so the user logs in with their new password.
        setTimeout(() => {
          router.push('/auth/signin')
        }, 1500)
      } catch (err) {
        const error = err as Error
        setError(error.message)
      }
    })
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Update Password</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}
          {success && (
            <Alert variant="success">
              Password updated. You will be signed out momentarily - please sign in with your new
              password.
            </Alert>
          )}

          <Input
            type="password"
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Input
            type="password"
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            helperText="Minimum 12 characters. Passphrases welcome."
            autoComplete="new-password"
          />

          <Input
            type="password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" loading={isPending}>
            Update Password
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}
