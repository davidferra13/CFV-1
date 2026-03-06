'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Check } from '@/components/ui/icons'
import { toast } from 'sonner'
import type { CommunityTemplate } from '@/lib/community/template-sharing'

export function CommunityTemplateImport({ template }: { template: CommunityTemplate }) {
  const [imported, setImported] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleImport() {
    startTransition(async () => {
      try {
        // For now, copy to clipboard or open in the relevant create form
        // In a full implementation, this would create the entity from the template content
        toast.success(`"${template.title}" template ready to use!`)
        setImported(true)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <Button
      size="sm"
      variant={imported ? 'secondary' : 'primary'}
      onClick={handleImport}
      loading={isPending}
      disabled={imported}
    >
      {imported ? (
        <>
          <Check className="h-3 w-3 mr-1" />
          Imported
        </>
      ) : (
        <>
          <Download className="h-3 w-3 mr-1" />
          Import
        </>
      )}
    </Button>
  )
}
