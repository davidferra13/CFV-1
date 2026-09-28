'use client'

// Archived clients, restorable. Rendered collapsed at the bottom of the Clients
// page and only when at least one client is archived.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { restoreClientFromUi, type ArchivedClient } from '@/lib/clients/archive-actions'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ArchivedClientsSection({ clients }: { clients: ArchivedClient[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [restoringId, setRestoringId] = useState<string | null>(null)

  function restore(client: ArchivedClient) {
    setRestoringId(client.id)
    startTransition(async () => {
      const result = await restoreClientFromUi(client.id)
      setRestoringId(null)
      if (!result.ok) {
        toast.error(result.reason)
        return
      }
      toast.success(`${client.fullName} restored`)
      router.refresh()
    })
  }

  return (
    <details className="group rounded-lg border border-stone-800" data-testid="archived-clients">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-stone-300">
        <span>Archived clients ({clients.length})</span>
        <span className="text-xs text-stone-500 group-open:hidden">Show</span>
        <span className="hidden text-xs text-stone-500 group-open:inline">Hide</span>
      </summary>
      <ul className="divide-y divide-stone-800 border-t border-stone-800">
        {clients.map((client) => (
          <li key={client.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-stone-200">{client.fullName}</p>
              <p className="truncate text-xs text-stone-500">
                {[client.email, `Archived ${formatDate(client.archivedAt)}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11 shrink-0"
              loading={pending && restoringId === client.id}
              disabled={pending}
              onClick={() => restore(client)}
            >
              Restore
            </Button>
          </li>
        ))}
      </ul>
    </details>
  )
}
