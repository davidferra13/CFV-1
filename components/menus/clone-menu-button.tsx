'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cloneMenu } from '@/lib/menus/actions'
import { Button } from '@/components/ui/button'

interface CloneMenuButtonProps {
  menuId: string
}

export function CloneMenuButton({ menuId }: CloneMenuButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleClone() {
    setLoading(true)
    setError(null)
    try {
      await cloneMenu(menuId)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clone menu'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button variant="secondary" onClick={handleClone} disabled={loading}>
        {loading ? 'Cloning...' : 'Clone Menu'}
      </Button>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  )
}
