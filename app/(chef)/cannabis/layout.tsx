import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { isAdmin } from '@/lib/auth/admin'

export default async function CannabisLayout({ children }: { children: React.ReactNode }) {
  await requireChef()
  let adminCheck: boolean
  try {
    adminCheck = await isAdmin()
  } catch (err) {
    console.error('[cannabis-layout] Admin check failed, denying access as safety fallback:', err)
    adminCheck = false
  }
  if (!adminCheck) {
    redirect('/dashboard')
  }
  return children
}
