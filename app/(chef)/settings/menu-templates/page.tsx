import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listFrontOfHouseTemplates } from '@/lib/front-of-house/menuGeneratorService'
import { MenuTemplateSettings } from '@/components/menus/menu-template-settings'

export default async function MenuTemplateSettingsPage() {
  await requireChef()
  const templates = await listFrontOfHouseTemplates()

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Link href="/settings" className="text-sm text-brand-500 hover:text-brand-400">
            Settings
          </Link>
          <span className="text-stone-400">/</span>
          <span className="text-sm text-stone-500">Menu Templates</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-stone-100">Front-of-House Menu Templates</h1>
        <p className="mt-1 text-stone-400">
          Manage default, holiday, and special-event templates used by the FOH menu generator.
        </p>
      </div>

      <MenuTemplateSettings templates={templates as any} />
    </div>
  )
}
