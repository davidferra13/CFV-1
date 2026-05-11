import type { Metadata } from 'next'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getConsolidatedDietaryProfile } from '@/lib/dietary/client-dietary-hub-actions'
import { ActivityTracker } from '@/components/activity/activity-tracker'

export const metadata: Metadata = { title: 'Dietary Profile' }

function DietaryBadge({
  label,
  variant = 'default',
}: {
  label: string
  variant?: 'allergy' | 'default' | 'dislike' | 'favorite'
}) {
  const colors = {
    allergy: 'bg-red-900/30 text-red-400 border-red-800/40',
    default: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40',
    dislike: 'bg-amber-900/30 text-amber-400 border-amber-800/40',
    favorite: 'bg-brand-900/30 text-brand-400 border-brand-800/40',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${colors[variant]}`}
    >
      {label}
    </span>
  )
}

export default async function MyDietaryPage() {
  await requireClient()
  const data = await getConsolidatedDietaryProfile()

  const hasPersonalData =
    data.personal_dietary.dietary_restrictions.length > 0 ||
    data.personal_dietary.allergies.length > 0 ||
    data.personal_dietary.dislikes.length > 0 ||
    data.personal_dietary.favorites.length > 0 ||
    data.personal_dietary.spice_tolerance ||
    data.personal_dietary.cuisine_preferences.length > 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Dietary Profile</h1>
        <p className="text-stone-400 mt-1">
          Everything your chef knows about dietary needs, all in one place.
        </p>
        {data.total_known_restrictions > 0 && (
          <p className="text-xs text-stone-500 mt-1">
            {data.total_known_restrictions} unique dietary consideration
            {data.total_known_restrictions !== 1 ? 's' : ''} on file
          </p>
        )}
      </div>

      {/* Section 1: My Dietary Profile */}
      <section className="rounded-lg border border-stone-700 bg-stone-800/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-stone-800 border-b border-stone-700">
          <h2 className="text-sm font-semibold text-stone-200">My Dietary Profile</h2>
          <Link href="/my-preferences" className="text-xs text-brand-400 hover:text-brand-300">
            Edit
          </Link>
        </div>
        <div className="px-4 py-4">
          {!hasPersonalData ? (
            <p className="text-stone-500 text-sm">
              No dietary information set yet.{' '}
              <Link href="/my-preferences" className="text-brand-400 hover:text-brand-300">
                Add your preferences
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {data.personal_dietary.allergies.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">
                    Allergies
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.personal_dietary.allergies.map((a) => (
                      <DietaryBadge key={a} label={a} variant="allergy" />
                    ))}
                  </div>
                </div>
              )}
              {data.personal_dietary.dietary_restrictions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">
                    Dietary Restrictions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.personal_dietary.dietary_restrictions.map((r) => (
                      <DietaryBadge key={r} label={r} />
                    ))}
                  </div>
                </div>
              )}
              {data.personal_dietary.dislikes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">
                    Dislikes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.personal_dietary.dislikes.map((d) => (
                      <DietaryBadge key={d} label={d} variant="dislike" />
                    ))}
                  </div>
                </div>
              )}
              {data.personal_dietary.favorites.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">
                    Favorites
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.personal_dietary.favorites.map((f) => (
                      <DietaryBadge key={f} label={f} variant="favorite" />
                    ))}
                  </div>
                </div>
              )}
              {data.personal_dietary.spice_tolerance && (
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">
                    Spice Tolerance
                  </p>
                  <p className="text-sm text-stone-200 capitalize">
                    {data.personal_dietary.spice_tolerance.replace('_', ' ')}
                  </p>
                </div>
              )}
              {data.personal_dietary.cuisine_preferences.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">
                    Cuisine Preferences
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.personal_dietary.cuisine_preferences.map((c) => (
                      <DietaryBadge key={c} label={c} variant="favorite" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Household Members */}
      <section className="rounded-lg border border-stone-700 bg-stone-800/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-stone-800 border-b border-stone-700">
          <h2 className="text-sm font-semibold text-stone-200">Household Members</h2>
          <Link href="/my-household" className="text-xs text-brand-400 hover:text-brand-300">
            Edit
          </Link>
        </div>
        <div className="px-4 py-4">
          {data.household_members_dietary.length === 0 ? (
            <p className="text-stone-500 text-sm">
              No household members added.{' '}
              <Link href="/my-household" className="text-brand-400 hover:text-brand-300">
                Add household members
              </Link>
            </p>
          ) : (
            <div className="space-y-3 divide-y divide-stone-700/50">
              {data.household_members_dietary.map((member) => (
                <div key={member.id} className="pt-3 first:pt-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-stone-200">{member.display_name}</p>
                    {member.relationship && (
                      <span className="text-xs text-stone-500">({member.relationship})</span>
                    )}
                  </div>
                  {member.allergies.length > 0 || member.dietary_restrictions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {member.allergies.map((a) => (
                        <DietaryBadge key={a} label={a} variant="allergy" />
                      ))}
                      {member.dietary_restrictions.map((r) => (
                        <DietaryBadge key={r} label={r} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500 mt-0.5">No dietary info on file</p>
                  )}
                  {member.notes && <p className="text-xs text-stone-500 mt-1">{member.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section 3: Guest Profiles */}
      {data.saved_guests_dietary.length > 0 && (
        <section className="rounded-lg border border-stone-700 bg-stone-800/50 overflow-hidden">
          <div className="px-4 py-3 bg-stone-800 border-b border-stone-700">
            <h2 className="text-sm font-semibold text-stone-200">Guest Profiles</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Dietary info from guests at your past events
            </p>
          </div>
          <div className="px-4 py-4">
            <div className="space-y-3 divide-y divide-stone-700/50">
              {data.saved_guests_dietary.map((guest) => (
                <div key={guest.id} className="pt-3 first:pt-0">
                  <p className="text-sm font-medium text-stone-200">{guest.display_name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {guest.known_allergies.map((a) => (
                      <DietaryBadge key={a} label={a} variant="allergy" />
                    ))}
                    {guest.known_dietary.map((r) => (
                      <DietaryBadge key={r} label={r} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Section 4: What My Chef Knows */}
      <section className="rounded-lg border border-stone-700 bg-stone-800/50 overflow-hidden">
        <div className="px-4 py-3 bg-stone-800 border-b border-stone-700">
          <h2 className="text-sm font-semibold text-stone-200">What My Chef Knows</h2>
        </div>
        <div className="px-4 py-4">
          {data.total_known_restrictions === 0 ? (
            <p className="text-stone-500 text-sm">
              Your chef has no dietary data on file yet. Add your preferences and household
              information to help your chef plan perfect meals.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-stone-300">
                Your chef can see {data.total_known_restrictions} dietary consideration
                {data.total_known_restrictions !== 1 ? 's' : ''} across your profile, household, and
                guests.
              </p>
              <p className="text-xs text-stone-500">
                This information is used when planning menus, checking allergens, and making dietary
                accommodations for your events.
              </p>
            </div>
          )}
        </div>
      </section>

      <ActivityTracker eventType="page_viewed" />
    </div>
  )
}
