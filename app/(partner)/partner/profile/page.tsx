// Partner Portal - Profile Settings
// Partners can edit their name, description, contact info, website, and booking URL.
// The chef controls whether the profile is publicly visible; that toggle is read-only here.

import { getPartnerPortalData, updatePartnerProfile } from '@/lib/partners/portal-actions'
import { revalidatePath } from 'next/cache'
import { Eye, EyeOff } from '@/components/ui/icons'
import { PartnerProfileForm } from '@/components/partners/partner-profile-form'

async function saveProfile(formData: FormData) {
  'use server'
  await updatePartnerProfile({
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    contact_name: formData.get('contact_name') as string,
    phone: formData.get('phone') as string,
    website: formData.get('website') as string,
    booking_url: formData.get('booking_url') as string,
    cover_image_url: formData.get('cover_image_url') as string,
  })
  revalidatePath('/partner/profile')
}

export default async function PartnerProfilePage() {
  const { partner } = await getPartnerPortalData()

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">My Profile</h1>
        <p className="mt-1 text-sm text-stone-500">
          This information appears on your public showcase page.
        </p>
      </div>

      {/* Showcase visibility (read-only, chef controls this) */}
      <div
        className={`flex items-center gap-3 rounded-xl border p-4 ${
          partner.is_showcase_visible
            ? 'border-green-200 bg-green-950'
            : 'border-stone-700 bg-stone-800'
        }`}
      >
        {partner.is_showcase_visible ? (
          <Eye size={16} className="text-green-600 shrink-0" />
        ) : (
          <EyeOff size={16} className="text-stone-400 shrink-0" />
        )}
        <div>
          <p className="text-sm font-medium text-stone-200">
            {partner.is_showcase_visible
              ? 'Your profile is publicly visible'
              : 'Your profile is not yet public'}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            Your chef controls public visibility. Contact them to update this.
          </p>
        </div>
      </div>

      {/* Edit form */}
      <PartnerProfileForm partner={partner} saveAction={saveProfile} />
    </div>
  )
}
