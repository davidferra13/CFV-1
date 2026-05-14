import { auth } from '@/lib/auth'
import { NotFoundRecovery } from '@/components/errors/not-found-recovery'

export default async function DemoNotFound() {
  const session = await auth()
  return <NotFoundRecovery audience="demo" signedInRole={session?.user?.role ?? null} />
}
