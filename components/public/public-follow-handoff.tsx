import { TrackedLink } from '@/components/analytics/tracked-link'
import { SaveChefButton } from '@/components/discovery/save-chef-button'

type Props = {
  chefId: string
  chefName: string
  publicSlug: string
  initialSaved: boolean
}

export function PublicFollowHandoff({ chefId, chefName, publicSlug, initialSaved }: Props) {
  const followInquiryHref = `/chef/${publicSlug}/inquire?ref=follow&package=follow-updates&package_label=${encodeURIComponent('Follow updates')}`

  return (
    <div className="rounded-2xl border border-stone-300/80 bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-600">
        Follow this chef
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-700">
        Save {chefName} to your ChefFlow shortlist, or ask to receive future menus and availability
        updates through inquiry.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <SaveChefButton
          chefId={chefId}
          initialSaved={initialSaved}
          source="public_profile_follow"
          label="Save chef"
          savedLabel="Saved"
          className="min-h-[44px] rounded-xl border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-900 hover:bg-stone-50"
        />
        <TrackedLink
          href={followInquiryHref}
          analyticsName="public_profile_follow_inquiry"
          analyticsProps={{ chef_slug: publicSlug }}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-stone-300 bg-white px-3 text-center text-sm font-semibold text-stone-900 hover:bg-stone-50"
        >
          Ask for updates
        </TrackedLink>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-stone-500">
        Update requests are consent-based and can be declined or unsubscribed from later.
      </p>
    </div>
  )
}
