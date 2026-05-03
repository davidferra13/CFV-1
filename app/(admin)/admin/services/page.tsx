import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/admin'
import { ServicesPanel } from './services-panel'

export default async function AdminServicesPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Mission Control</h1>
        <p className="text-sm text-stone-500 mt-1">
          Service on/off switches. Control what runs on this machine.
        </p>
      </div>
      <ServicesPanel />
    </div>
  )
}
