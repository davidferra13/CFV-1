import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getAutoResponseConfig } from '@/lib/communication/auto-response'
import { getBusinessHoursConfig } from '@/lib/communication/business-hours'
import { getTemplates } from '@/lib/communication/templates/actions'
import { AutoResponseSettings } from '@/components/communication/auto-response-settings'
import { BusinessHoursEditor } from '@/components/communication/business-hours-editor'
import { TemplateList } from '@/components/communication/template-list'

export const metadata = { title: 'Communication Settings | ChefFlow' }

async function AutoResponseSection() {
  const config = await getAutoResponseConfig()
  return <AutoResponseSettings config={config} />
}

async function BusinessHoursSection() {
  const config = await getBusinessHoursConfig()
  return <BusinessHoursEditor config={config} />
}

async function TemplatesSection() {
  const templates = await getTemplates()
  return <TemplateList templates={templates} />
}

export default async function CommunicationSettingsPage() {
  await requireChef()

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">Communication Settings</h1>
        <p className="text-stone-400 mt-1">
          Configure auto-responses, business hours, and message templates.
        </p>
      </div>

      <Suspense fallback={<SectionSkeleton title="Auto-Response" />}>
        <AutoResponseSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="Business Hours" />}>
        <BusinessHoursSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="Response Templates" />}>
        <TemplatesSection />
      </Suspense>
    </div>
  )
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-stone-300 mb-4">{title}</h2>
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-stone-800 rounded w-3/4" />
        <div className="h-4 bg-stone-800 rounded w-1/2" />
        <div className="h-10 bg-stone-800 rounded w-full" />
      </div>
    </div>
  )
}
