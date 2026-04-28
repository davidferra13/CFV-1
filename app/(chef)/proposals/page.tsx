// Proposals Hub - Manage proposal templates and add-ons
// Links to template builder and add-on library

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { listProposalTemplates } from '@/lib/proposals/template-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProposalTemplate } from '@/lib/proposals/template-types'

export const metadata: Metadata = { title: 'Proposals' }

export default async function ProposalsPage() {
  await requireChef()

  const templatesResult = await loadTemplates()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Proposals</h1>
          <p className="text-stone-400 mt-1">
            Manage your proposal templates and add-on packages for client presentations.
          </p>
        </div>
        <Link
          href="/proposals/templates"
          className="inline-flex items-center justify-center px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium text-sm"
        >
          Build Template
        </Link>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/proposals/templates">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="text-lg">Proposal Templates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-sm text-stone-500">
                Design and manage reusable proposal layouts with your menus, pricing, and branding.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/proposals/addons">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="text-lg">Add-On Packages</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-sm text-stone-500">
                Create upsell options like premium wine pairings, extra courses, or tableside
                experiences.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Template List */}
      <div>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
          Your Templates (
          {templatesResult.success ? templatesResult.templates.length : 'Unavailable'})
        </h2>
        {!templatesResult.success ? (
          <Card className="p-8 text-center border-red-900/50">
            <p className="text-stone-100 text-sm font-medium">Proposal templates could not load.</p>
            <p className="text-stone-500 text-sm mt-1">{templatesResult.error}</p>
          </Card>
        ) : templatesResult.templates.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-stone-500 text-sm">
              No proposal templates yet. Create your first template to start sending polished
              proposals.
            </p>
            <Link
              href="/proposals/templates"
              className="inline-block mt-4 text-sm text-brand-500 hover:text-brand-400 font-medium"
            >
              Create your first template
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templatesResult.templates.map((template) => (
              <Link key={template.id} href="/proposals/templates">
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                  <h3 className="font-semibold text-stone-100 mb-1">
                    {template.name || 'Untitled Template'}
                  </h3>
                  {template.description && (
                    <p className="text-sm text-stone-500 line-clamp-2">{template.description}</p>
                  )}
                  <p className="text-xs text-stone-400 mt-2">
                    {template.updatedAt
                      ? `Updated ${new Date(template.updatedAt).toLocaleDateString()}`
                      : 'Draft'}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

async function loadTemplates(): Promise<
  { success: true; templates: ProposalTemplate[] } | { success: false; error: string }
> {
  try {
    return { success: true, templates: await listProposalTemplates() }
  } catch (err) {
    console.error('[proposals] Failed to load proposal templates', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    }
  }
}
