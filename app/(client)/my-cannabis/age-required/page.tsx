import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'

import { getClientCannabisAccessStatus } from '@/lib/cannabis/client-portal-guards'
import { redirect } from 'next/navigation'
import { AgeAttestationForm } from './age-attestation-form'

export const metadata: Metadata = { title: 'Age Verification Required' }

export default async function AgeRequiredPage() {
  const user = await requireClient()
  const accessStatus = await getClientCannabisAccessStatus(user.id)

  if (!accessStatus.hasTierAccess) {
    redirect('/my-events')
  }

  if (accessStatus.hasAgePermission) {
    redirect('/my-cannabis')
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Age Verification Required</h1>
          <p className="text-muted-foreground text-sm">
            Cannabis dining experiences are exclusively for adults 21 years of age or older. Please
            confirm your eligibility to continue.
          </p>
        </div>

        {accessStatus.ageStatus === 'blocked' && (
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-red-800 dark:text-red-200 text-sm">
              Your age verification has been blocked. Please contact your chef for assistance.
            </p>
          </div>
        )}

        {accessStatus.ageStatus === 'rejected' && (
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-red-800 dark:text-red-200 text-sm">
              Your previous verification was not approved. Please contact your chef for assistance.
            </p>
          </div>
        )}

        {accessStatus.ageExpired && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
            <p className="text-amber-800 dark:text-amber-200 text-sm">
              Your age verification has expired. Please re-confirm below.
            </p>
          </div>
        )}

        {!['blocked', 'rejected'].includes(accessStatus.ageStatus ?? '') && <AgeAttestationForm />}
      </div>
    </div>
  )
}
