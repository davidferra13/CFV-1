// Response Templates Management Page
// Chef can create, edit, delete, and manage response templates for quick communication logging

import { requireChef } from '@/lib/auth/get-user'
import { getResponseTemplates } from '@/lib/messages/actions'
import { TemplateManager } from '@/components/messages/template-manager'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function TemplatesPage() {
  await requireChef()

  const templates = await getResponseTemplates()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/settings" className="text-sm text-brand-500 hover:text-brand-400">
              Settings
            </Link>
            <span className="text-stone-400">/</span>
            <span className="text-sm text-stone-500">Response Templates</span>
          </div>
          <h1 className="text-3xl font-bold text-stone-100 mt-2">Response Templates</h1>
          <p className="text-stone-400 mt-1">
            Pre-written messages you can quickly copy and customize when logging communication.
          </p>
        </div>
      </div>

      <TemplateManager templates={templates} />
    </div>
  )
}
