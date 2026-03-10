// Template Library - Save and reuse event, order, and production templates
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getTemplates } from '@/lib/templates/template-actions'
import { TemplateLibrary } from '@/components/templates/template-library'

export const metadata: Metadata = {
  title: 'Templates | ChefFlow',
}

export default async function TemplatesPage() {
  await requireChef()

  const templates = await getTemplates()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-100">Template Library</h1>
        <p className="text-stone-500 mt-1">
          Save any event, order, or production plan as a reusable template. One-click duplicate for
          recurring work.
        </p>
      </div>

      <TemplateLibrary initialTemplates={templates} />
    </div>
  )
}
