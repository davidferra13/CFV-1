// Template Library Page
// Reusable message templates - system-seeded starters + chef-created.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listCampaignTemplates } from '@/lib/marketing/actions'
import { CAMPAIGN_TYPE_LABELS } from '@/lib/marketing/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TemplateActionsClient } from './template-actions-client'
import { CreateTemplateClient } from './create-template-client'

export const metadata: Metadata = { title: 'Templates | ChefFlow' }

export default async function TemplatesPage() {
  await requireChef()
  const templates = await listCampaignTemplates()

  const systemTemplates = templates.filter((t: any) => t.is_system)
  const ownTemplates = templates.filter((t: any) => !t.is_system)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/marketing"
          className="text-sm text-stone-500 hover:text-stone-300 mb-2 inline-block"
        >
          ← Marketing
        </Link>
        <h1 className="text-2xl font-bold text-stone-100">Template Library</h1>
        <p className="mt-1 text-sm text-stone-500">
          Pre-built starters and your own saved templates. Pick one in the campaign builder to
          pre-fill the form.
        </p>
      </div>

      {/* System templates */}
      {systemTemplates.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
            Starter Templates
          </h2>
          {systemTemplates.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-100">{t.name}</span>
                      <Badge variant="default">
                        {CAMPAIGN_TYPE_LABELS[t.campaign_type] ?? t.campaign_type}
                      </Badge>
                      <Badge variant="info">Starter</Badge>
                    </div>
                    <p className="text-sm text-stone-500 mt-0.5 truncate">{t.subject}</p>
                    <pre className="whitespace-pre-wrap text-xs text-stone-400 mt-2 max-h-16 overflow-hidden line-clamp-3">
                      {t.body_html.slice(0, 200)}
                      {t.body_html.length > 200 ? '…' : ''}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Own templates */}
      {ownTemplates.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
            Your Templates
          </h2>
          {ownTemplates.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-100">{t.name}</span>
                      <Badge variant="default">
                        {CAMPAIGN_TYPE_LABELS[t.campaign_type] ?? t.campaign_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-stone-500 mt-0.5 truncate">{t.subject}</p>
                    <pre className="whitespace-pre-wrap text-xs text-stone-400 mt-2 max-h-16 overflow-hidden">
                      {t.body_html.slice(0, 200)}
                      {t.body_html.length > 200 ? '…' : ''}
                    </pre>
                  </div>
                  <TemplateActionsClient templateId={t.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {ownTemplates.length === 0 && (
        <p className="text-sm text-stone-500">
          No custom templates yet. You can save any sent campaign as a template from its detail
          page.
        </p>
      )}

      {/* Create new template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create Template</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTemplateClient />
        </CardContent>
      </Card>
    </div>
  )
}
