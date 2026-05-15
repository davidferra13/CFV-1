// Page for new users to select their role (Chef or Client)
'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { assignRole } from '@/lib/auth/actions'

export default function RoleSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-950" />}>
      <RoleSelectionContent />
    </Suspense>
  )
}

function RoleSelectionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const signupRef = searchParams?.get('ref')?.trim().toLowerCase() || undefined
  const sourcePage = searchParams?.get('source_page')?.trim() || undefined
  const sourceCta = searchParams?.get('source_cta')?.trim() || undefined
  const [loading, setLoading] = useState<'chef' | 'client' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRoleSelection = async (role: 'chef' | 'client') => {
    setLoading(role)
    setError(null)
    try {
      await assignRole(role, { signup_ref: signupRef })
      // On success, the server action will redirect, but we'll refresh the client-side state
      // and push to a default dashboard in case the redirect doesn't fire for any reason.
      const destination = role === 'chef' ? '/dashboard' : '/my-events'
      router.push(destination)
      router.refresh()
    } catch (err) {
      // Re-throw redirect errors - these are intentional navigations from redirect()
      if (isRedirectError(err)) throw err
      const error = err as Error
      setError(error.message)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <PublicPageView
        pageName="role_selection"
        properties={{
          ...(signupRef ? { signup_ref: signupRef } : {}),
          ...(sourcePage ? { source_page: sourcePage } : {}),
          ...(sourceCta ? { source_cta: sourceCta } : {}),
        }}
      />
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-100">One Last Step</h1>
          <p className="text-stone-400 mt-2">How will you be using ChefFlow?</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How will you use ChefFlow?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && <Alert variant="error">{error}</Alert>}
            <p className="text-sm text-stone-400">
              Pick your primary role. You can add more roles later from your settings.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button
              variant="primary"
              className="w-full"
              loading={loading === 'chef'}
              disabled={!!loading}
              onClick={() => handleRoleSelection('chef')}
            >
              I&apos;m a Chef
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              loading={loading === 'client'}
              disabled={!!loading}
              onClick={() => handleRoleSelection('client')}
            >
              I&apos;m booking a chef
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
