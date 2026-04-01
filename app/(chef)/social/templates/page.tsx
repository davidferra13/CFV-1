// Social Media Templates
// Reusable caption and post templates for social media.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Social Templates' }

export default async function SocialTemplatesPage() {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: templates } = await db
    .from('social_templates')
    .select('id, title, content, platform, template_type, created_at')
    .eq('chef_id', chef.entityId)
    .order('created_at', { ascending: false })

  const templateList = templates ?? []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Social Templates</h1>
          <p className="mt-1 text-sm text-stone-500">
            Reusable caption templates for Instagram, Facebook, and other platforms. Save time when
            posting from events.
          </p>
        </div>
        <Link href="/social/planner">
          <Button variant="secondary" size="sm">
            Content Planner
          </Button>
        </Link>
      </div>

      {templateList.length === 0 ? (
        <div className="text-center py-20 bg-stone-800 rounded-xl border border-dashed border-stone-600">
          <h3 className="text-lg font-semibold text-stone-200 mb-1">No templates yet</h3>
          <p className="text-sm text-stone-500 mb-4 max-w-sm mx-auto">
            Create reusable caption templates to speed up your social media posting workflow.
          </p>
          <Link href="/social/planner">
            <Button variant="primary">Go to Content Planner</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templateList.map((template: any) => (
            <Card key={template.id} className="p-4">
              <CardHeader className="p-0 mb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{template.title ?? 'Untitled'}</CardTitle>
                  {template.platform && (
                    <span className="text-xs text-stone-400 bg-stone-700 px-2 py-0.5 rounded-full capitalize">
                      {template.platform}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {template.content && (
                  <p className="text-sm text-stone-400 line-clamp-3 whitespace-pre-line">
                    {template.content}
                  </p>
                )}
                {template.template_type && (
                  <p className="text-xs text-stone-500 mt-2 capitalize">
                    {template.template_type.replace(/_/g, ' ')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
