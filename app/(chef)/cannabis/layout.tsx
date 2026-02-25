import { headers } from 'next/headers'
import {
  requireCannabisAgreementSigned,
  requireCannabisInviteAccess,
} from '@/lib/chef/cannabis-access-guards'

function isAgreementOpenPath(pathname: string): boolean {
  return (
    pathname === '/cannabis/about' ||
    pathname.startsWith('/cannabis/about/') ||
    pathname === '/cannabis/unlock' ||
    pathname.startsWith('/cannabis/unlock/') ||
    pathname === '/cannabis/agreement' ||
    pathname.startsWith('/cannabis/agreement/')
  )
}

export default async function CannabisLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCannabisInviteAccess()
  const pathname = headers().get('x-pathname') ?? ''

  if (!isAgreementOpenPath(pathname)) {
    await requireCannabisAgreementSigned(user.id)
  }

  return children
}
