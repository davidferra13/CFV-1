import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { NotFoundRecovery } from '@/components/errors/not-found-recovery'

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'Find the right ChefFlow page from this route recovery screen.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function NotFound() {
  const session = await auth()
  return <NotFoundRecovery audience="public" signedInRole={session?.user?.role ?? null} />
}
