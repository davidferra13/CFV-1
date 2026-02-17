// Delete Account Form — Client Component
// Requires typing "DELETE" and entering password to confirm account deletion

'use client'

import { useState, useTransition } from 'react'
import { deleteAccount } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

export function DeleteAccountForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [confirmation, setConfirmation] = useState('')
  const [password, setPassword] = useState('')

  const isConfirmed = confirmation === 'DELETE'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isConfirmed) {
      setError('Please type DELETE to confirm')
      return
    }

    if (!password) {
      setError('Please enter your password')
      return
    }

    startTransition(async () => {
      try {
        await deleteAccount(password)
        // redirect happens server-side
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
          <CardTitle>Confirm Account Deletion</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          <div>
            <p className="text-sm text-stone-700 mb-2">
              Type <strong>DELETE</strong> to confirm you want to permanently delete your account:
            </p>
            <Input
              type="text"
              label="Confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="Type DELETE"
              required
              autoComplete="off"
            />
          </div>

          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            helperText="Enter your password to verify your identity"
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="danger"
            loading={isPending}
            disabled={!isConfirmed}
          >
            Permanently Delete Account
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}
