import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { SettingsCategory } from '@/components/settings/settings-category'

export const metadata: Metadata = { title: 'Settings - My Craft' }

export default async function MyCraftSettingsPage() {
  await requireChef()

  return (
    <div>
      {/* Mobile back */}
      <div className="mb-4 md:hidden">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-100 sm:text-3xl">My Craft</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-300">
          Your culinary identity, professional growth, creative journal, and seasonal planning.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsCategory
          title="Culinary Identity"
          description="Your cooking philosophy, specializations, and food identity."
          icon="ChefHat"
          primary
          tone="brand"
          defaultOpen={true}
        >
          <div className="space-y-3">
            <Link
              href="/settings/culinary-profile"
              className="block border border-brand-700 rounded-lg p-4 bg-brand-950/40 hover:bg-brand-950 transition-colors"
            >
              <p className="font-semibold text-brand-200">Culinary Profile</p>
              <p className="text-sm text-brand-400 mt-1">
                Tell the system about your cooking philosophy, signature dishes, and food identity.
              </p>
            </Link>
          </div>
        </SettingsCategory>

        <SettingsCategory
          title="Professional Growth"
          description="Skills, credentials, and career development."
          icon="TrendingUp"
          tone="neutral"
          defaultOpen={true}
        >
          <div className="space-y-3">
            <Link
              href="/settings/professional"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Professional Development</p>
              <p className="text-sm text-stone-500 mt-1">
                Track career milestones, competitions, awards, and learning goals.
              </p>
            </Link>

            <Link
              href="/settings/professional/skills"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Capability Inventory</p>
              <p className="text-sm text-stone-500 mt-1">
                Self-rate your confidence across cuisines, dietary needs, and techniques.
              </p>
            </Link>

            <Link
              href="/settings/professional/momentum"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Professional Momentum</p>
              <p className="text-sm text-stone-500 mt-1">
                Visualize your professional trajectory and growth across dishes, cuisines, and
                education.
              </p>
            </Link>

            <Link
              href="/settings/highlights"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Profile Highlights</p>
              <p className="text-sm text-stone-500 mt-1">
                Curate achievements, certifications, press features, and awards for your public
                profile.
              </p>
            </Link>

            <Link
              href="/settings/portfolio"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Portfolio</p>
              <p className="text-sm text-stone-500 mt-1">
                Showcase your best work with photos and descriptions.
              </p>
            </Link>

            <Link
              href="/settings/credentials"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Credentials</p>
              <p className="text-sm text-stone-500 mt-1">
                Career timeline, work history, charity impact, and private resume.
              </p>
            </Link>
          </div>
        </SettingsCategory>

        <SettingsCategory
          title="Creative Studio"
          description="Your culinary journal and seasonal planning."
          icon="BookOpen"
          tone="neutral"
          defaultOpen={true}
        >
          <div className="space-y-3">
            <Link
              href="/settings/journal"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Chef Journal</p>
              <p className="text-sm text-stone-500 mt-1">
                Track travel inspiration, service notes, favorite meals, and ideas worth revisiting.
              </p>
            </Link>

            <Link
              href="/settings/repertoire"
              className="block border rounded-lg p-4 hover:bg-stone-800 transition-colors"
            >
              <p className="font-medium text-stone-100">Seasonal Palettes</p>
              <p className="text-sm text-stone-500 mt-1">
                Define your creative thesis, micro-windows, and proven wins for each season.
              </p>
            </Link>
          </div>
        </SettingsCategory>
      </div>
    </div>
  )
}
