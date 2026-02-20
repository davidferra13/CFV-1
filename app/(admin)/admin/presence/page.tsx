// Admin Presence Page — Real-time view of every visitor on the site
// The AdminPresencePanel client component handles the Supabase Realtime subscription

import { requireAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import { AdminPresencePanel } from '@/components/admin/admin-presence-panel'
import { Radio } from 'lucide-react'

export default async function AdminPresencePage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-50 rounded-lg">
          <Radio size={18} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Live Presence</h1>
          <p className="text-sm text-slate-500">Everyone on the site right now — anonymous visitors, logged-in chefs and clients</p>
        </div>
        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-2 text-xs text-green-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          LIVE
        </div>
      </div>

      <AdminPresencePanel />
    </div>
  )
}
