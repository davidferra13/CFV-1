// Change Password Form - Client Component
// Validates inputs and calls server action to update password

'use client'

import { useState, useTransition } from 'react'
import { changePassword } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

export function ChangePasswordForm() {
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
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must include at least one uppercase letter')
      return
    }

    if (!/[0-9]/.test(newPassword)) {
      setError('Password must include at least one number')
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
          {success && <Alert variant="success">Password updated successfully.</Alert>}

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
            helperText="Minimum 8 characters, 1 uppercase, 1 number"
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
