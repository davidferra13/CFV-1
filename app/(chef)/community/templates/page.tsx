import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getCommunityTemplates } from '@/lib/community/template-sharing'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Globe } from '@/components/ui/icons'
import { CommunityTemplateImport } from '@/components/community/community-template-import'

export const metadata: Metadata = { title: 'Community Templates - ChefFlow' }

export default async function CommunityTemplatesPage() {
  await requireChef()
  const templates = await getCommunityTemplates()

  const TEMPLATE_TYPE_LABELS: Record<string, string> = {
    menu: 'Menu',
    recipe: 'Recipe',
    message: 'Message Template',
    quote: 'Quote Template',
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Community Templates</h1>
          <p className="text-stone-400 mt-1">Browse and import templates shared by other chefs</p>
        </div>
        <Button variant="secondary" disabled title="Coming soon">
          <Globe className="h-4 w-4 mr-2" />
          Share a Template (Coming Soon)
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">No community templates yet. Be the first to share one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="py-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="info">
                        {TEMPLATE_TYPE_LABELS[template.template_type] || template.template_type}
                      </Badge>
                      {template.cuisine_type && (
                        <Badge variant="default">{template.cuisine_type}</Badge>
                      )}
                    </div>
                    <p className="font-semibold text-stone-100 truncate">{template.title}</p>
                    {template.description && (
                      <p className="text-sm text-stone-500 mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {template.download_count}
                      </span>
                    </div>
                  </div>
                  <CommunityTemplateImport template={template} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
