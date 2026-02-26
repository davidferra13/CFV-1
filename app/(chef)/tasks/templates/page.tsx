// Task Templates Page
// List all templates, expand to see items, create new, and generate tasks from templates.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listTemplates } from '@/lib/tasks/template-actions'
import { TEMPLATE_CATEGORIES } from '@/lib/tasks/template-constants'
import { getActiveStaff } from '@/lib/tasks/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TemplatePageClient } from '@/components/tasks/template-page-client'

export const metadata: Metadata = { title: 'Task Templates — ChefFlow' }

export default async function TaskTemplatesPage() {
  await requireChef()

  const [templates, staff] = await Promise.all([listTemplates(), getActiveStaff()])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Task Templates</h1>
          <p className="mt-1 text-sm text-stone-500">
            Create reusable task templates and generate daily tasks from them.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tasks">
            <Button variant="secondary" size="sm">
              Back to Tasks
            </Button>
          </Link>
        </div>
      </div>

      <TemplatePageClient templates={templates} staff={staff} />
    </div>
  )
}
