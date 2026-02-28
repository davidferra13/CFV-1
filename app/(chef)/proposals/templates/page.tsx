// Proposal Templates — Visual builder for proposal templates
// Fetches templates and menus, renders the interactive builder

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { listProposalTemplates } from '@/lib/proposals/template-actions'
import { VisualBuilder } from '@/components/proposals/visual-builder'

export const metadata: Metadata = { title: 'Proposal Templates - ChefFlow' }

export default async function ProposalTemplatesPage() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const [templates, menusResult] = await Promise.all([
    listProposalTemplates().catch(() => []),
    supabase
      .from('menus')
      .select('id, name')
      .eq('chef_id', user.tenantId!)
      .then((res: any) => res.data ?? [])
      .catch(() => []),
  ])

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

      <VisualBuilder
        templates={templates as any[]}
        menus={menusResult as { id: string; name: string }[]}
      />
    </div>
  )
}
