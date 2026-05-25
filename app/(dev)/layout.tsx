import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const devEmails = ['davidferra13@gmail.com']

  if (!session?.user?.email || !devEmails.includes(session.user.email)) {
    redirect('/')
  }

  return <>{children}</>
}
