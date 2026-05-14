import { auth } from '@/lib/auth'
import { NotFoundRecovery } from '@/components/errors/not-found-recovery'

export default async function NotFound() {
  const session = await auth()
  return <NotFoundRecovery audience="admin" signedInRole={session?.user?.role ?? 'admin'} />
}
