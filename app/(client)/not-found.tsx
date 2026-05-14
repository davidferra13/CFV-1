import { auth } from '@/lib/auth'
import { NotFoundRecovery } from '@/components/errors/not-found-recovery'

export default async function NotFound() {
  const session = await auth()
  return <NotFoundRecovery audience="client" signedInRole={session?.user?.role ?? 'client'} />
}
