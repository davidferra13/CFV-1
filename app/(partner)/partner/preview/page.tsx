// Partner Portal — Preview
// Shows the partner exactly how they appear on the chef's public showcase page.
// Fetches the same data that clients see — truth in advertising.

import { requirePartner } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { Eye, EyeOff, ExternalLink } from 'lucide-react'

export default async function PartnerPreviewPage() {
  const user = await requirePartner()
  const supabase = createServerClient({ admin: true })

  // Fetch partner record with locations and images
  const { data: partner } = await supabase
    .from('referral_partners')
    .select(
      `
      id, name, description, website, booking_url, cover_image_url,
      is_showcase_visible,
      partner_locations(
        id, name, city, state, max_guest_count, description, is_active,
        partner_images(id, image_url, caption, display_order)
      ),
      partner_images!partner_images_partner_id_fkey(
        id, image_url, caption, display_order
      )
    `
    )
    .eq('id', user.partnerId)
    .single()

  // Fetch the chef's slug so we can link to the live public page
  const { data: chef } = await supabase
    .from('chefs')
    .select('slug, display_name, business_name')
    .eq('id', user.tenantId)
    .single()

  const activeLocations = ((partner?.partner_locations as any[]) || []).filter(
    (l: any) => l.is_active
  )
  const allImages = ((partner?.partner_images as any[]) || []).sort(
    (a: any, b: any) => (a.display_order ?? 99) - (b.display_order ?? 99)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Preview Your Public Page</h1>
          <p className="mt-1 text-sm text-stone-500">
            This is exactly how clients see you on{' '}
            {chef?.business_name ?? chef?.display_name ?? 'the chef'}'s page.
          </p>
        </div>
        {chef?.slug && (
          <a
            href={`/chef/${chef.slug}#partners`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 border border-stone-200 rounded-lg px-3 py-2"
          >
            <ExternalLink size={14} />
            Live page
          </a>
        )}
      </div>

      {/* Visibility notice */}
      <div
        className={`flex items-center gap-3 rounded-xl border p-4 ${
          partner?.is_showcase_visible
            ? 'border-green-200 bg-green-50'
            : 'border-amber-200 bg-amber-50'
        }`}
      >
        {partner?.is_showcase_visible ? (
          <Eye size={16} className="text-green-600 shrink-0" />
        ) : (
          <EyeOff size={16} className="text-amber-600 shrink-0" />
        )}
        <p className="text-sm font-medium text-stone-800">
          {partner?.is_showcase_visible
            ? 'Your profile is live and visible to clients.'
            : 'Your profile is not yet visible. Your chef needs to enable it.'}
        </p>
      </div>

      {/* ── Showcase card — what clients see ─────────────────────────────── */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
        {/* Cover image */}
        {partner?.cover_image_url ? (
          <div className="h-48 overflow-hidden bg-stone-100">
            <img
              src={partner.cover_image_url}
              alt={partner?.name ?? ''}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
            <p className="text-stone-400 text-sm">No cover image yet</p>
          </div>
        )}

        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">{partner?.name}</h2>
            {partner?.description && (
              <p className="mt-2 text-sm text-stone-600">{partner.description}</p>
            )}
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-3">
            {partner?.website && (
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-stone-600 underline"
              >
                Website
              </a>
            )}
            {partner?.booking_url && (
              <a
                href={partner.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-stone-600 underline"
              >
                Book this space
              </a>
            )}
          </div>

          {/* Locations */}
          {activeLocations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-stone-700 mb-2">
                Spaces ({activeLocations.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeLocations.map((loc: any) => {
                  const thumb = loc.partner_images?.[0]?.image_url ?? null
                  return (
                    <div
                      key={loc.id}
                      className="rounded-lg border border-stone-100 overflow-hidden"
                    >
                      {thumb ? (
                        <div className="h-24 bg-stone-100 overflow-hidden">
                          <img src={thumb} alt={loc.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-24 bg-stone-50" />
                      )}
                      <div className="p-3">
                        <p className="text-sm font-medium text-stone-800">{loc.name}</p>
                        {(loc.city || loc.state) && (
                          <p className="text-xs text-stone-500">
                            {[loc.city, loc.state].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {loc.max_guest_count && (
                          <p className="text-xs text-stone-400 mt-0.5">
                            Up to {loc.max_guest_count} guests
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Photo gallery */}
          {allImages.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-stone-700 mb-2">Gallery</h3>
              <div className="grid grid-cols-3 gap-2">
                {allImages.slice(0, 6).map((img: any) => (
                  <div
                    key={img.id}
                    className="aspect-square rounded-lg overflow-hidden bg-stone-100"
                  >
                    <img
                      src={img.image_url}
                      alt={img.caption ?? ''}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-stone-400 text-center">
        To update your profile, go to{' '}
        <a href="/partner/profile" className="underline">
          My Profile
        </a>
        .
      </p>
    </div>
  )
}
