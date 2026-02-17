'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { createMenu } from '@/lib/menus/actions'

export function CreateMenuForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [serviceStyle, setServiceStyle] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!name.trim()) {
        throw new Error('Menu name is required')
      }

      const result = await createMenu({
        name,
        description: description || undefined,
        cuisine_type: cuisineType || undefined,
        service_style: serviceStyle ? serviceStyle as any : undefined
      })

      router.push(`/menus/${result.menu.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create menu')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Menu Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Menu Name <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer BBQ Menu"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this menu template..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Cuisine Type
            </label>
            <Input
              type="text"
              value={cuisineType}
              onChange={(e) => setCuisineType(e.target.value)}
              placeholder="e.g., Italian, Japanese, American BBQ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Service Style
            </label>
            <select
              className="w-full px-3 py-2 border border-stone-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              value={serviceStyle}
              onChange={(e) => setServiceStyle(e.target.value)}
              aria-label="Service style"
            >
              <option value="">Select style (optional)</option>
              <option value="plated">Plated</option>
              <option value="family_style">Family Style</option>
              <option value="buffet">Buffet</option>
              <option value="cocktail">Cocktail</option>
              <option value="tasting_menu">Tasting Menu</option>
              <option value="other">Other</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Menu'}
        </Button>
      </div>
    </form>
  )
}
