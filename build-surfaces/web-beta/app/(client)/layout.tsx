import { redirect } from 'next/navigation'
import { requireClient } from '@/lib/auth/get-user'
import { ReleasePortalShell } from '../_components/release-portal-shell'

export default async function WebBetaClientLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireClient()
  } catch {
    redirect('/auth/signin?portal=client')
  }

  return (
    <ReleasePortalShell
      portal="client"
      portalLabel="Client Portal"
      primaryHref="/my-profile"
      primaryLabel="My Profile"
      surfaceMode="editing"
    >
      {children}
    </ReleasePortalShell>
  )
}
