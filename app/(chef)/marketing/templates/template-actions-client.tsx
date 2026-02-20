'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { deleteCampaignTemplate } from '@/lib/marketing/actions'

export function TemplateActionsClient({ templateId }: { templateId: string }) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this template? This cannot be undone.')) return
    setLoading(true)
    try {
      await deleteCampaignTemplate(templateId)
      router.refresh()
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
      className="shrink-0 text-stone-400 hover:text-red-600"
    >
      {loading ? '…' : 'Delete'}
    </Button>
  )
}
