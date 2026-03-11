'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  createBatch,
  updateBatch,
  deleteBatch,
  getBatchesForDate,
  advanceBatchStatus,
  recordYield,
  calculateScaleFactor,
  getIngredientRequirements,
  type BakeryBatch,
  type BatchStatus,
  type ScaledIngredient,
  type IngredientRequirement,
} from '@/lib/bakery/batch-planning-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const STATUS_COLORS: Record<BatchStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  planned: 'default',
  in_progress: 'info',
  proofing: 'warning',
  baking: 'warning',
  cooling: 'info',
  finished: 'success',
  cancelled: 'error',
}

const STATUS_LABELS: Record<BatchStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  proofing: 'Proofing',
  baking: 'Baking',
  cooling: 'Cooling',
  finished: 'Finished',
  cancelled: 'Cancelled',
}

export default function BatchPlanner() {
  const [isPending, startTransition] = useTransition()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [batches, setBatches] = useState<BakeryBatch[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [scaledIngredients, setScaledIngredients] = useState<ScaledIngredient[]>([])
  const [requirements, setRequirements] = useState<IngredientRequirement[]>([])
  const [yieldInputs, setYieldInputs] = useState<Record<string, string>>({})

  // Form state
  const [formData, setFormData] = useState({
    product_name: '',
    recipe_id: '',
    planned_quantity: '',
    assigned_to: '',
    notes: '',
  })

  // Load batches for selected date
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await getBatchesForDate(selectedDate)
        if (!cancelled) {
          setBatches(data)
          setLoadError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError('Could not load batches')
          setBatches([])
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [selectedDate])

  // Load ingredient requirements when batches change
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const reqs = await getIngredientRequirements(selectedDate)
        if (!cancelled) setRequirements(reqs)
      } catch {
        if (!cancelled) setRequirements([])
      }
    }
    if (batches.length > 0) {
      load()
    } else {
      setRequirements([])
    }
    return () => {
      cancelled = true
    }
  }, [batches, selectedDate])

  function handleAddBatch() {
    const previous = batches
    startTransition(async () => {
      try {
        const quantity = parseInt(formData.planned_quantity, 10)
        if (!formData.product_name || !quantity || quantity <= 0) {
          toast.error('Product name and quantity are required')
          return
        }

        let scaleFactor = 1.0
        if (formData.recipe_id && quantity) {
          try {
            const result = await calculateScaleFactor(formData.recipe_id, quantity)
            scaleFactor = result.scale_factor
          } catch {
            // If recipe has no yield, default to 1.0
          }
        }

        const newBatch = await createBatch({
          product_name: formData.product_name,
          recipe_id: formData.recipe_id || undefined,
          planned_date: selectedDate,
          planned_quantity: quantity,
          scale_factor: scaleFactor,
          assigned_to: formData.assigned_to || undefined,
          notes: formData.notes || undefined,
        })
        setBatches((prev) => [...prev, newBatch])
        setFormData({
          product_name: '',
          recipe_id: '',
          planned_quantity: '',
          assigned_to: '',
          notes: '',
        })
        setScaledIngredients([])
        setShowForm(false)
        toast.success('Batch planned')
      } catch (err) {
        setBatches(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to create batch')
      }
    })
  }

  function handleAdvance(id: string) {
    const previous = batches
    startTransition(async () => {
      try {
        const updated = await advanceBatchStatus(id)
        setBatches((prev) => prev.map((b) => (b.id === id ? updated : b)))
        toast.success(`Moved to ${STATUS_LABELS[updated.status]}`)
      } catch (err) {
        setBatches(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to advance')
      }
    })
  }

  function handleRecordYield(id: string) {
    const yieldStr = yieldInputs[id]
    const yieldNum = parseInt(yieldStr, 10)
    if (!yieldStr || isNaN(yieldNum) || yieldNum < 0) {
      toast.error('Enter a valid yield')
      return
    }
    const previous = batches
    startTransition(async () => {
      try {
        const updated = await recordYield(id, yieldNum)
        setBatches((prev) => prev.map((b) => (b.id === id ? updated : b)))
        setYieldInputs((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        toast.success('Yield recorded')
      } catch (err) {
        setBatches(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to record yield')
      }
    })
  }

  function handleDelete(id: string) {
    const previous = batches
    setBatches((prev) => prev.filter((b) => b.id !== id))
    startTransition(async () => {
      try {
        await deleteBatch(id)
        toast.success('Batch removed')
      } catch (err) {
        setBatches(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to delete')
      }
    })
  }

  async function handleRecipeChange(recipeId: string) {
    setFormData((prev) => ({ ...prev, recipe_id: recipeId }))
    if (recipeId && formData.planned_quantity) {
      try {
        const result = await calculateScaleFactor(recipeId, parseInt(formData.planned_quantity, 10))
        setScaledIngredients(result.ingredients)
      } catch {
        setScaledIngredients([])
      }
    } else {
      setScaledIngredients([])
    }
  }

  async function handleQuantityChange(qty: string) {
    setFormData((prev) => ({ ...prev, planned_quantity: qty }))
    if (formData.recipe_id && qty) {
      try {
        const result = await calculateScaleFactor(formData.recipe_id, parseInt(qty, 10))
        setScaledIngredients(result.ingredients)
      } catch {
        setScaledIngredients([])
      }
    } else {
      setScaledIngredients([])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Batch Production Planning</h1>
        <div className="flex items-center gap-3">
          <Label htmlFor="date-select" className="sr-only">
            Date
          </Label>
          <Input
            id="date-select"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
          />
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add Batch'}
          </Button>
        </div>
      </div>

      {/* Add Batch Form */}
      {showForm && (
        <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
          <h2 className="font-semibold">Plan New Batch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="product_name">Product Name</Label>
              <Input
                id="product_name"
                value={formData.product_name}
                onChange={(e) => setFormData((p) => ({ ...p, product_name: e.target.value }))}
                placeholder="e.g., Croissants"
              />
            </div>
            <div>
              <Label htmlFor="planned_quantity">Target Quantity</Label>
              <Input
                id="planned_quantity"
                type="number"
                min="1"
                value={formData.planned_quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder="e.g., 200"
              />
            </div>
            <div>
              <Label htmlFor="recipe_id">Recipe ID (optional)</Label>
              <Input
                id="recipe_id"
                value={formData.recipe_id}
                onChange={(e) => handleRecipeChange(e.target.value)}
                placeholder="Paste recipe UUID"
              />
            </div>
            <div>
              <Label htmlFor="assigned_to">Assigned To (optional)</Label>
              <Input
                id="assigned_to"
                value={formData.assigned_to}
                onChange={(e) => setFormData((p) => ({ ...p, assigned_to: e.target.value }))}
                placeholder="e.g., Maria"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Any special instructions"
              />
            </div>
          </div>

          {/* Scaled Ingredients Preview */}
          {scaledIngredients.length > 0 && (
            <div className="rounded border p-3 bg-background">
              <h3 className="text-sm font-medium mb-2">Scaled Ingredients</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
                {scaledIngredients.map((si) => (
                  <div key={si.ingredient_id} className="flex justify-between">
                    <span>{si.ingredient_name}</span>
                    <span className="text-muted-foreground">
                      {si.scaled_quantity} {si.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleAddBatch} disabled={isPending}>
            {isPending ? 'Saving...' : 'Plan Batch'}
          </Button>
        </div>
      )}

      {/* Batch List */}
      {loadError && (
        <div className="rounded border border-red-300 bg-red-50 dark:bg-red-950 p-4 text-red-200 dark:text-red-300">
          {loadError}
        </div>
      )}

      {!loadError && batches.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          No batches planned for {selectedDate}
        </p>
      )}

      <div className="space-y-3">
        {batches.map((batch) => (
          <div
            key={batch.id}
            className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{batch.product_name}</h3>
                <Badge variant={STATUS_COLORS[batch.status]}>{STATUS_LABELS[batch.status]}</Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1 space-x-3">
                <span>Qty: {batch.planned_quantity}</span>
                <span>Scale: {batch.scale_factor}x</span>
                {batch.assigned_to && <span>By: {batch.assigned_to}</span>}
                {batch.actual_yield !== null && <span>Yield: {batch.actual_yield}</span>}
              </div>
              {batch.notes && <p className="text-sm text-muted-foreground mt-1">{batch.notes}</p>}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {batch.status !== 'finished' && batch.status !== 'cancelled' && (
                <Button
                  variant="secondary"
                  onClick={() => handleAdvance(batch.id)}
                  disabled={isPending}
                >
                  Advance
                </Button>
              )}
              {(batch.status === 'finished' || batch.status === 'cooling') &&
                batch.actual_yield === null && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      className="w-20"
                      placeholder="Yield"
                      value={yieldInputs[batch.id] ?? ''}
                      onChange={(e) =>
                        setYieldInputs((prev) => ({
                          ...prev,
                          [batch.id]: e.target.value,
                        }))
                      }
                    />
                    <Button
                      variant="secondary"
                      onClick={() => handleRecordYield(batch.id)}
                      disabled={isPending}
                    >
                      Log
                    </Button>
                  </div>
                )}
              {batch.status === 'planned' && (
                <Button variant="ghost" onClick={() => handleDelete(batch.id)} disabled={isPending}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Daily Ingredient Requirements */}
      {requirements.length > 0 && (
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-3">Daily Ingredient Summary ({selectedDate})</h2>
          <div className="space-y-2">
            {requirements.map((req) => (
              <div key={req.ingredient_id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{req.ingredient_name}</span>
                <div className="flex items-center gap-4">
                  <span>
                    Need: {req.total_needed} {req.unit}
                  </span>
                  {req.current_stock !== null && (
                    <span className="text-muted-foreground">
                      Have: {req.current_stock} {req.unit}
                    </span>
                  )}
                  {req.shortfall !== null && req.shortfall > 0 && (
                    <Badge variant="error">
                      Short: {req.shortfall} {req.unit}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
