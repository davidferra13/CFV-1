import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getCustomArchetype } from '@/lib/archetypes/builder-actions'
import { ARCHETYPES } from '@/lib/archetypes/presets'
import { MODULES } from '@/lib/billing/modules'
import { getEnabledModules } from '@/lib/billing/module-actions'
import { ArchetypeBuilderForm } from '@/components/settings/archetype-builder-form'
import { standaloneTop } from '@/components/navigation/nav-config'
import {
  DASHBOARD_WIDGET_IDS,
  DASHBOARD_WIDGET_LABELS,
  DASHBOARD_WIDGET_META,
  WIDGET_CATEGORY_LABELS,
} from '@/lib/scheduling/types'

export const metadata: Metadata = { title: 'Archetype Builder - ChefFlow' }

export default async function ArchetypeBuilderPage() {
  const user = await requireChef()
  const [customConfig, currentModules] = await Promise.all([
    getCustomArchetype(),
    getEnabledModules(),
  ])

  // Build serializable nav items for client component
  const navItems = standaloneTop
    .filter((item) => !item.adminOnly)
    .map((item) => ({
      href: item.href,
      label: item.label,
    }))

  // Build serializable widget list grouped by category
  const widgetOptions = (DASHBOARD_WIDGET_IDS as readonly string[]).map((id) => {
    const meta = DASHBOARD_WIDGET_META[id as keyof typeof DASHBOARD_WIDGET_META]
    return {
      id,
      label: DASHBOARD_WIDGET_LABELS[id as keyof typeof DASHBOARD_WIDGET_LABELS] || id,
      category: meta?.category || 'system',
      categoryLabel:
        WIDGET_CATEGORY_LABELS[meta?.category as keyof typeof WIDGET_CATEGORY_LABELS] || 'Other',
    }
  })

  // Build serializable preset data
  const presets = ARCHETYPES.map((a) => ({
    id: a.id,
    label: a.label,
    description: a.description,
    emoji: a.emoji,
    enabledModules: a.enabledModules,
    primaryNavHrefs: a.primaryNavHrefs,
    mobileTabHrefs: a.mobileTabHrefs,
  }))

  // Build serializable module data grouped by tier
  const moduleOptions = MODULES.map((m) => ({
    slug: m.slug,
    label: m.label,
    description: m.description,
    tier: m.tier,
    alwaysVisible: m.alwaysVisible,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Archetype Builder</h1>
        <p className="text-stone-400 mt-1">
          Create your own custom configuration. Pick modules, arrange navigation, choose dashboard
          widgets, and save it as your personal setup.
        </p>
      </div>
      <ArchetypeBuilderForm
        customConfig={customConfig}
        currentModules={currentModules}
        presets={presets}
        moduleOptions={moduleOptions}
        navItems={navItems}
        widgetOptions={widgetOptions}
      />
    </div>
  )
}
