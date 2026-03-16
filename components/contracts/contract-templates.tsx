import { deleteContractTemplate } from '@/lib/contracts/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ContractTemplateEditor } from '@/components/contracts/contract-template-editor'

type ContractTemplate = {
  id: string
  name: string
  body_markdown: string
  is_default: boolean
  version: number
}

export function ContractTemplates({
  templates,
  chefId,
}: {
  templates: ContractTemplate[]
  chefId: string
}) {
  return (
    <div className="space-y-4">
      {templates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create your first template</CardTitle>
          </CardHeader>
          <CardContent>
            <ContractTemplateEditor chefId={chefId} />
          </CardContent>
        </Card>
      ) : (
        <>
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <div className="flex items-center gap-2 text-xs text-stone-400">
                    {template.is_default && (
                      <span className="rounded-full border border-emerald-700 px-2 py-0.5 text-emerald-300">
                        Default
                      </span>
                    )}
                    <span>v{template.version}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <pre className="max-h-28 overflow-hidden whitespace-pre-wrap rounded-md border border-stone-700 bg-stone-900 p-3 text-xs text-stone-300">
                  {template.body_markdown}
                </pre>
                <details className="rounded-md border border-stone-700 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-stone-200">
                    Edit template
                  </summary>
                  <div className="mt-4">
                    <ContractTemplateEditor template={template} chefId={chefId} />
                  </div>
                </details>

                <form
                  action={async () => {
                    'use server'
                    await deleteContractTemplate(template.id)
                  }}
                >
                  <Button type="submit" variant="secondary" size="sm">
                    Delete template
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add another template</CardTitle>
            </CardHeader>
            <CardContent>
              <ContractTemplateEditor chefId={chefId} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
