// Proposal Builder
// Step-by-step wizard for building a custom proposal for a client.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Proposal Builder | ChefFlow' }

export default async function ProposalBuilderPage() {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: templates } = await supabase
    .from('proposal_templates')
    .select('id, name, description, updated_at')
    .eq('chef_id', chef.entityId)
    .order('updated_at', { ascending: false })

  const { data: addons } = await supabase
    .from('proposal_addons')
    .select('id, name, price_cents, description')
    .eq('chef_id', chef.entityId)
    .order('name')

  const templateList = templates ?? []
  const addonList = addons ?? []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Proposal Builder</h1>
          <p className="text-stone-400 mt-1">
            Build a custom proposal for a client. Start from a template or create from scratch, then
            attach menus, pricing, and add-ons.
          </p>
        </div>
        <Link href="/proposals/templates">
          <Button variant="primary">New Template</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/proposals/templates">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="text-base">Templates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-sm text-stone-500">
                {templateList.length} saved {templateList.length === 1 ? 'template' : 'templates'}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/proposals/addons">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="text-base">Add-Ons</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-sm text-stone-500">
                {addonList.length} add-on {addonList.length === 1 ? 'package' : 'packages'}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/rate-card">
          <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader className="p-0 mb-2">
              <CardTitle className="text-base">Rate Card</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <p className="text-sm text-stone-500">Your pricing and service rates</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
          Start from a Template
        </h2>
        {templateList.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-stone-500 text-sm">No templates yet.</p>
            <Link
              href="/proposals/templates"
              className="inline-block mt-3 text-sm text-amber-400 hover:text-amber-300 font-medium"
            >
              Create your first template
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templateList.map((t: any) => (
              <Link key={t.id} href={`/proposals/templates?edit=${t.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                  <h3 className="font-semibold text-stone-100 mb-1">{t.name ?? 'Untitled'}</h3>
                  {t.description && (
                    <p className="text-sm text-stone-500 line-clamp-2">{t.description}</p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
