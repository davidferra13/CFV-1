import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getCommunityTemplates } from '@/lib/community/template-sharing'
import { getMenus } from '@/lib/menus/actions'
import { getRecipes } from '@/lib/recipes/actions'
import { getResponseTemplates } from '@/lib/messages/actions'
import { listProposalTemplates } from '@/lib/proposals/template-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, Globe } from '@/components/ui/icons'
import { CommunityTemplateImport } from '@/components/community/community-template-import'
import { CommunityTemplateShare } from '@/components/community/community-template-share'

export const metadata: Metadata = { title: 'Community Templates - ChefFlow' }

export default async function CommunityTemplatesPage() {
  await requireChef()

  const [templates, menus, recipes, messageTemplates, proposalTemplates] = await Promise.all([
    getCommunityTemplates(),
    getMenus().catch(() => []),
    getRecipes().catch(() => []),
    getResponseTemplates().catch(() => []),
    listProposalTemplates().catch(() => []),
  ])

  const menuItems = (menus as any[]).map((m) => ({
    id: m.id,
    name: m.name || 'Untitled Menu',
    meta: m.cuisine_type || undefined,
  }))

  const recipeItems = (recipes as any[]).map((r) => ({
    id: r.id,
    name: r.name || 'Untitled Recipe',
    meta: r.category || undefined,
  }))

  const msgItems = (messageTemplates as any[]).map((t) => ({
    id: t.id,
    name: t.name || 'Untitled Template',
    meta: t.category || undefined,
  }))

  const proposalItems = (proposalTemplates as any[]).map((p) => ({
    id: p.id,
    name: p.name || 'Untitled Proposal',
  }))

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
        <CommunityTemplateShare
          menus={menuItems}
          recipes={recipeItems}
          messageTemplates={msgItems}
          proposalTemplates={proposalItems}
        />
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
