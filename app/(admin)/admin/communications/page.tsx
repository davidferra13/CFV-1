// Admin Communications — Platform announcements and direct email

import { requireAdmin } from '@/lib/auth/admin'
import { getAnnouncement, type AnnouncementType } from '@/lib/admin/platform-actions'
import { AnnouncementForm } from '@/components/admin/announcement-form'
import { DirectEmailForm } from '@/components/admin/direct-email-form'
import { BroadcastEmailForm } from '@/components/admin/broadcast-email-form'
import { redirect } from 'next/navigation'
import { Megaphone, Mail, Send } from 'lucide-react'

export default async function AdminCommunicationsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  // Load current announcement (if any)
  let currentText = ''
  let currentType: AnnouncementType = 'info'
  let announcementError: string | null = null

  try {
    const ann = await getAnnouncement()
    currentText = ann?.text ?? ''
    currentType = ann?.type ?? 'info'
  } catch {
    announcementError = 'platform_settings table not yet applied. Run the latest migrations to enable this feature.'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-50 rounded-lg">
          <Megaphone size={18} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Communications</h1>
          <p className="text-sm text-slate-500">Platform-wide announcements and direct messaging</p>
        </div>
      </div>

      {/* Announcement Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Megaphone size={16} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-700">Platform Announcement Banner</h2>
          {currentText && (
            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              Active
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Set a message that appears at the top of every logged-in chef&apos;s portal. Leave blank to clear.
        </p>
        {announcementError ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-800">
            {announcementError}
          </div>
        ) : (
          <AnnouncementForm currentText={currentText} currentType={currentType} />
        )}
      </div>

      {/* Direct Email */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={16} className="text-blue-500" />
          <h2 className="text-sm font-semibold text-slate-700">Direct Email</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Send an email directly to any user (chef or client) on the platform.
        </p>
        <DirectEmailForm />
      </div>

      {/* Broadcast */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Send size={16} className="text-purple-500" />
          <h2 className="text-sm font-semibold text-slate-700">Broadcast Email</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Send a message to all chefs, or all inactive chefs (no activity in 60+ days). Emails are sent via BCC so recipients cannot see each other.
        </p>
        <BroadcastEmailForm />
      </div>
    </div>
  )
}
