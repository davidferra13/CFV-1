'use client'

import { useTransition } from 'react'
import { deleteCreativeProject } from '@/lib/professional/creative-project-actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const STATUS_VARIANTS: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
  experimenting: 'info',
  nearly_there: 'warning',
  mastered: 'success',
  abandoned: 'default',
}

export function CreativeProjectCard({
  project,
  onEdit,
}: {
  project: {
    id: string
    dish_name: string
    cuisine: string | null
    notes: string | null
    status: string
  }
  onEdit?: () => void
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-stone-900">{project.dish_name}</p>
              <Badge variant={STATUS_VARIANTS[project.status] ?? 'default'}>
                {project.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            {project.cuisine && <p className="text-xs text-stone-500">{project.cuisine}</p>}
            {project.notes && (
              <p className="text-sm text-stone-600 mt-1 line-clamp-2">{project.notes}</p>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await deleteCreativeProject(project.id)
                  } catch (err) {
                    toast.error('Failed to delete project')
                  }
                })
              }
            >
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
