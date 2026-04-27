// Staff Portal - My Profile
// Staff members can edit their display name, phone, and bio/notes.
// Email and role are read-only (controlled by the chef).

import { getMyProfile, updateMyStaffProfile } from '@/lib/staff/staff-portal-actions'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function saveProfile(formData: FormData) {
  'use server'
  const result = await updateMyStaffProfile({
    display_name: (formData.get('display_name') as string) ?? '',
    phone: (formData.get('phone') as string) ?? '',
    notes: (formData.get('notes') as string) ?? '',
  })

  if (!result.success) {
    // Re-render with error via searchParams
    redirect(`/staff-profile?error=${encodeURIComponent(result.error ?? 'Update failed')}`)
  }

  redirect('/staff-profile?saved=1')
}

export default async function StaffProfilePage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string }
}) {
  const profile = await getMyProfile()

  if (!profile) {
    return (
      <div className="max-w-xl space-y-6">
        <h1 className="text-2xl font-bold text-stone-100">My Profile</h1>
        <div className="rounded-xl border border-red-700 bg-red-950 p-4 text-sm text-red-300">
          Unable to load your profile. Please try again or contact your chef.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">My Profile</h1>
        <p className="mt-1 text-sm text-stone-500">
          Update your contact information and bio. Your chef controls your email and role.
        </p>
      </div>

      {/* Success toast */}
      {searchParams.saved === '1' && (
        <div className="rounded-xl border border-green-700 bg-green-950 p-4 text-sm text-green-300">
          Profile updated successfully.
        </div>
      )}

      {/* Error toast */}
      {searchParams.error && (
        <div className="rounded-xl border border-red-700 bg-red-950 p-4 text-sm text-red-300">
          {searchParams.error}
        </div>
      )}

      <form action={saveProfile} className="space-y-5">
        <div className="rounded-xl border border-stone-700 bg-stone-900 p-6 space-y-4">
          {/* Display Name (editable) */}
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-stone-300 mb-1">
              Display Name
            </label>
            <input
              id="display_name"
              name="display_name"
              defaultValue={profile.name}
              required
              className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
          </div>

          {/* Phone (editable) */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-stone-300 mb-1">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={profile.phone ?? ''}
              className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label htmlFor="email_readonly" className="block text-sm font-medium text-stone-300 mb-1">
              Email <span className="font-normal text-stone-500">(set by your chef)</span>
            </label>
            <input
              id="email_readonly"
              value={profile.email ?? 'Not set'}
              readOnly
              className="w-full rounded-lg border border-stone-700 bg-stone-800/50 px-3 py-2 text-sm text-stone-400 cursor-not-allowed"
            />
          </div>

          {/* Role (read-only) */}
          <div>
            <label htmlFor="role_readonly" className="block text-sm font-medium text-stone-300 mb-1">
              Role <span className="font-normal text-stone-500">(set by your chef)</span>
            </label>
            <input
              id="role_readonly"
              value={profile.role ?? 'Not set'}
              readOnly
              className="w-full rounded-lg border border-stone-700 bg-stone-800/50 px-3 py-2 text-sm text-stone-400 cursor-not-allowed capitalize"
            />
          </div>

          {/* Notes / Bio (editable) */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-stone-300 mb-1">
              Bio / Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={profile.notes ?? ''}
              rows={4}
              className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400 resize-none"
              placeholder="A short bio or notes about yourself..."
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-stone-700 text-white py-2.5 text-sm font-semibold hover:bg-stone-600 transition-colors"
        >
          Save Profile
        </button>
      </form>
    </div>
  )
}
