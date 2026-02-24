// Contract Templates — Settings Page
// Chef creates and manages reusable contract templates.
// Templates are rendered with merge fields at contract generation time.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { listContractTemplates, deleteContractTemplate } from '@/lib/contracts/actions'
import { ContractTemplateEditor } from '@/components/contracts/contract-template-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Contract Templates — ChefFlow' }

export default async function ContractTemplatesPage() {
  await requireChef()
  const templates = await listContractTemplates()

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Contract Templates</h1>
          <p className="mt-1 text-sm text-stone-500">
            Create reusable contract templates. Use{' '}
            <code className="rounded bg-stone-800 px-1 py-0.5 text-xs font-mono">
              {'{{merge_fields}}'}
            </code>{' '}
            for event-specific values filled automatically.
          </p>
        </div>
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            ← Back to Settings
          </Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create your first template</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-500 mb-4">
              You don&apos;t have any contract templates yet. Create one and it will be available to
              generate and send from any event page.
            </p>
            <ContractTemplateEditor />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.is_default && (
                      <span className="rounded-full bg-amber-900 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-stone-400">v{template.version}</span>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="max-h-32 overflow-hidden text-xs text-stone-500 bg-stone-800 rounded p-3 whitespace-pre-wrap line-clamp-4">
                  {template.body_markdown.slice(0, 300)}
                  {template.body_markdown.length > 300 ? '…' : ''}
                </pre>
                <div className="mt-3 flex gap-2">
                  <details className="w-full">
                    <summary className="cursor-pointer text-sm text-amber-700 hover:text-amber-900 font-medium">
                      Edit template
                    </summary>
                    <div className="mt-4">
                      <ContractTemplateEditor template={template} />
                    </div>
                  </details>
                  <form
                    action={async () => {
                      'use server'
                      await deleteContractTemplate(template.id)
                    }}
                  >
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add another template</CardTitle>
            </CardHeader>
            <CardContent>
              <ContractTemplateEditor />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
