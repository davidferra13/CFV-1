// Proposal Templates - Visual builder for proposal templates
// Fetches templates and menus, renders the interactive builder

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { listProposalTemplates } from '@/lib/proposals/template-actions'
import { VisualBuilder } from '@/components/proposals/visual-builder'
import { Card } from '@/components/ui/card'
import type { ProposalTemplate } from '@/lib/proposals/template-types'

export const metadata: Metadata = { title: 'Proposal Templates' }

type ProposalTemplateMenu = { id: string; name: string }

export default async function ProposalTemplatesPage() {
  const user = await requireChef()

  const builderData = await loadTemplateBuilderData(user.tenantId!)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/proposals" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Proposals
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Proposal Templates</h1>
          <p className="text-stone-400 mt-1">
            Design polished proposals with your menus, pricing sections, and custom branding.
          </p>
        </div>
      </div>

      {builderData.success ? (
        <VisualBuilder templates={builderData.templates} menus={builderData.menus} />
      ) : (
        <Card className="p-8 text-center border-red-900/50">
          <p className="text-stone-100 text-sm font-medium">
            Proposal template data could not load.
          </p>
          <p className="text-stone-500 text-sm mt-1">{builderData.error}</p>
        </Card>
      )}
    </div>
  )
}

async function loadTemplateBuilderData(
  tenantId: string
): Promise<
  | { success: true; templates: ProposalTemplate[]; menus: ProposalTemplateMenu[] }
  | { success: false; error: string }
> {
  try {
    const [templates, menus] = await Promise.all([listProposalTemplates(), listMenus(tenantId)])
    return { success: true, templates, menus }
  } catch (err) {
    console.error('[proposals] Failed to load proposal template builder data', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    }
  }
}

async function listMenus(tenantId: string): Promise<ProposalTemplateMenu[]> {
  const db: any = createServerClient()
  const { data, error } = await db
    .from('menus')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (error) throw new Error(`Failed to list menus: ${error.message}`)

  return data ?? []
}
