// Admin Communications — Platform announcements and direct email

import { requireAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import { Megaphone, Mail, Send } from 'lucide-react'

export default async function AdminCommunicationsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
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
        <div className="flex items-center gap-2 mb-4">
          <Megaphone size={16} className="text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-700">Platform Announcement Banner</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Set a message that appears at the top of every logged-in user&apos;s portal. Leave blank to clear.
        </p>
        <div className="space-y-3">
          <textarea
            placeholder="Enter announcement text... (e.g. 'ChefFlow will be down for maintenance on Sunday 2am–4am ET')"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
            rows={3}
            disabled
          />
          <div className="flex items-center gap-3">
            <button
              disabled
              className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg opacity-50 cursor-not-allowed"
            >
              Set Announcement
            </button>
            <button
              disabled
              className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg opacity-50 cursor-not-allowed"
            >
              Clear
            </button>
            <span className="text-xs text-slate-400">Coming soon — requires platform_settings table</span>
          </div>
        </div>
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
        <div className="space-y-3">
          <input
            type="email"
            placeholder="recipient@email.com"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            disabled
          />
          <input
            type="text"
            placeholder="Subject"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            disabled
          />
          <textarea
            placeholder="Message body..."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            rows={5}
            disabled
          />
          <div className="flex items-center gap-3">
            <button
              disabled
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg opacity-50 cursor-not-allowed"
            >
              Send Email
            </button>
            <span className="text-xs text-slate-400">Coming soon — requires email infrastructure integration</span>
          </div>
        </div>
      </div>

      {/* Broadcast */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Send size={16} className="text-purple-500" />
          <h2 className="text-sm font-semibold text-slate-700">Broadcast Email</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Send a message to all chefs, or all inactive chefs (no login in 60+ days).
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            disabled
            className="px-4 py-2 bg-purple-100 text-purple-700 text-sm font-medium rounded-lg opacity-50 cursor-not-allowed"
          >
            Email All Chefs
          </button>
          <button
            disabled
            className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg opacity-50 cursor-not-allowed"
          >
            Email Inactive Chefs (60+ days)
          </button>
          <span className="text-xs text-slate-400 self-center">Coming soon</span>
        </div>
      </div>
    </div>
  )
}
