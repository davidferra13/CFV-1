import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { isAdmin } from '@/lib/auth/admin'

export default async function CannabisLayout({ children }: { children: React.ReactNode }) {
  await requireChef()
  const adminCheck = await isAdmin().catch(() => false)
  if (!adminCheck) {
    redirect('/dashboard')
  }
  return children
}
