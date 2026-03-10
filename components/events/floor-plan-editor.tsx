// Floor Plan Editor
// Simple drag-and-drop layout tool for station positions, table placement, and service flow

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  updateFloorPlan,
  type FloorPlan,
  type FloorPlanElement,
} from '@/lib/events/floor-plan-actions'

// ── Element type config ──────────────────────────────────────────────
const ELEMENT_TYPES: {
  type: FloorPlanElement['type']
  label: string
  color: string
  defaultWidth: number
  defaultHeight: number
  icon: string
}[] = [
  {
    type: 'table_round',
    label: 'Round Table',
    color: '#3b82f6',
    defaultWidth: 60,
    defaultHeight: 60,
    icon: '○',
  },
  {
    type: 'table_rect',
    label: 'Rect Table',
    color: '#2563eb',
    defaultWidth: 80,
    defaultHeight: 40,
    icon: '▬',
  },
  {
    type: 'station',
    label: 'Station',
    color: '#f97316',
    defaultWidth: 80,
    defaultHeight: 50,
    icon: '▣',
  },
  { type: 'bar', label: 'Bar', color: '#8b5cf6', defaultWidth: 100, defaultHeight: 40, icon: '▤' },
  {
    type: 'buffet',
    label: 'Buffet',
    color: '#22c55e',
    defaultWidth: 120,
    defaultHeight: 40,
    icon: '▥',
  },
  {
    type: 'entrance',
    label: 'Entrance',
    color: '#6b7280',
    defaultWidth: 50,
    defaultHeight: 30,
    icon: '→',
  },
  { type: 'exit', label: 'Exit', color: '#9ca3af', defaultWidth: 50, defaultHeight: 30, icon: '←' },
  {
    type: 'kitchen',
    label: 'Kitchen',
    color: '#ef4444',
    defaultWidth: 100,
    defaultHeight: 80,
    icon: '⌂',
  },
  {
    type: 'stage',
    label: 'Stage',
    color: '#ec4899',
    defaultWidth: 120,
    defaultHeight: 60,
    icon: '♪',
  },
  {
    type: 'dance_floor',
    label: 'Dance Floor',
    color: '#f472b6',
    defaultWidth: 100,
    defaultHeight: 100,
    icon: '♫',
  },
  {
    type: 'restroom',
    label: 'Restroom',
    color: '#64748b',
    defaultWidth: 50,
    defaultHeight: 50,
    icon: 'WC',
  },
  {
    type: 'custom',
    label: 'Custom',
    color: '#a855f7',
    defaultWidth: 60,
    defaultHeight: 60,
    icon: '✦',
  },
]

function getTypeConfig(type: FloorPlanElement['type']) {
  return ELEMENT_TYPES.find((t) => t.type === type) ?? ELEMENT_TYPES[ELEMENT_TYPES.length - 1]
}

function generateId(): string {
  return crypto.randomUUID()
}

// ── Main Component ───────────────────────────────────────────────────
export function FloorPlanEditor({ floorPlan, eventId }: { floorPlan: FloorPlan; eventId: string }) {
  const [elements, setElements] = useState<FloorPlanElement[]>(floorPlan.elements || [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dragState, setDragState] = useState<{
    elementId: string
    startX: number
    startY: number
    elStartX: number
    elStartY: number
  } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const selectedElement = elements.find((el) => el.id === selectedId) ?? null

  // ── Add element ────────────────────────────────────────────────────
  const addElement = useCallback(
    (type: FloorPlanElement['type']) => {
      const config = getTypeConfig(type)
      const newEl: FloorPlanElement = {
        id: generateId(),
        type,
        label: config.label,
        x: Math.round(floorPlan.canvas_width / 2 - config.defaultWidth / 2),
        y: Math.round(floorPlan.canvas_height / 2 - config.defaultHeight / 2),
        width: config.defaultWidth,
        height: config.defaultHeight,
        rotation: 0,
        color: config.color,
        seats: type.startsWith('table') ? 8 : undefined,
      }
      setElements((prev) => [...prev, newEl])
      setSelectedId(newEl.id)
      setSaved(false)
    },
    [floorPlan.canvas_width, floorPlan.canvas_height]
  )

  // ── Update selected element ────────────────────────────────────────
  const updateElement = useCallback((id: string, updates: Partial<FloorPlanElement>) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...updates } : el)))
    setSaved(false)
  }, [])

  // ── Delete element ─────────────────────────────────────────────────
  const deleteElement = useCallback(
    (id: string) => {
      setElements((prev) => prev.filter((el) => el.id !== id))
      if (selectedId === id) setSelectedId(null)
      setSaved(false)
    },
    [selectedId]
  )

  // ── Drag handling ──────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      e.stopPropagation()
      e.preventDefault()
      const el = elements.find((el) => el.id === elementId)
      if (!el) return
      setSelectedId(elementId)
      setDragState({
        elementId,
        startX: e.clientX,
        startY: e.clientY,
        elStartX: el.x,
        elStartY: el.y,
      })
    },
    [elements]
  )

  useEffect(() => {
    if (!dragState) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragState.startX
      const dy = e.clientY - dragState.startY
      const el = elements.find((el) => el.id === dragState.elementId)
      if (!el) return

      // Clamp to canvas
      const newX = Math.max(0, Math.min(floorPlan.canvas_width - el.width, dragState.elStartX + dx))
      const newY = Math.max(
        0,
        Math.min(floorPlan.canvas_height - el.height, dragState.elStartY + dy)
      )

      // Snap to grid (20px)
      const snappedX = showGrid ? Math.round(newX / 20) * 20 : newX
      const snappedY = showGrid ? Math.round(newY / 20) * 20 : newY

      updateElement(dragState.elementId, { x: snappedX, y: snappedY })
    }

    const handleMouseUp = () => {
      setDragState(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    dragState,
    elements,
    floorPlan.canvas_width,
    floorPlan.canvas_height,
    showGrid,
    updateElement,
  ])

  // Touch support
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, elementId: string) => {
      e.stopPropagation()
      const touch = e.touches[0]
      const el = elements.find((el) => el.id === elementId)
      if (!el) return
      setSelectedId(elementId)
      setDragState({
        elementId,
        startX: touch.clientX,
        startY: touch.clientY,
        elStartX: el.x,
        elStartY: el.y,
      })
    },
    [elements]
  )

  useEffect(() => {
    if (!dragState) return

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      const dx = touch.clientX - dragState.startX
      const dy = touch.clientY - dragState.startY
      const el = elements.find((el) => el.id === dragState.elementId)
      if (!el) return

      const newX = Math.max(0, Math.min(floorPlan.canvas_width - el.width, dragState.elStartX + dx))
      const newY = Math.max(
        0,
        Math.min(floorPlan.canvas_height - el.height, dragState.elStartY + dy)
      )
      const snappedX = showGrid ? Math.round(newX / 20) * 20 : newX
      const snappedY = showGrid ? Math.round(newY / 20) * 20 : newY

      updateElement(dragState.elementId, { x: snappedX, y: snappedY })
    }

    const handleTouchEnd = () => {
      setDragState(null)
    }

    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [
    dragState,
    elements,
    floorPlan.canvas_width,
    floorPlan.canvas_height,
    showGrid,
    updateElement,
  ])

  // ── Save ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      await updateFloorPlan(floorPlan.id, elements)
      setSaved(true)
    } catch (err) {
      console.error('Failed to save floor plan:', err)
      alert('Failed to save floor plan. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Print ──────────────────────────────────────────────────────────
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const elHtml = elements
      .map((el) => {
        const config = getTypeConfig(el.type)
        return `<div style="
          position: absolute;
          left: ${el.x}px;
          top: ${el.y}px;
          width: ${el.width}px;
          height: ${el.height}px;
          background: ${el.color}22;
          border: 2px solid ${el.color};
          border-radius: ${el.type === 'table_round' || el.type === 'dance_floor' ? '50%' : '4px'};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #333;
          transform: rotate(${el.rotation}deg);
          text-align: center;
          overflow: hidden;
        ">
          <span>${el.label}${el.seats ? ` (${el.seats})` : ''}</span>
        </div>`
      })
      .join('\n')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Floor Plan</title></head>
      <body style="margin: 20px; font-family: sans-serif;">
        <h2 style="margin-bottom: 16px;">${floorPlan.name}</h2>
        <div style="
          position: relative;
          width: ${floorPlan.canvas_width}px;
          height: ${floorPlan.canvas_height}px;
          border: 1px solid #ccc;
          background: #fafafa;
        ">
          ${elHtml}
        </div>
        <script>window.print()</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Deselect when clicking canvas background
  const handleCanvasClick = () => setSelectedId(null)

  // Keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        // Don't delete if user is typing in an input
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        deleteElement(selectedId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, deleteElement])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleSave} disabled={saving || saved}>
          {saving ? 'Saving...' : saved ? 'Saved' : 'Save Layout'}
        </Button>
        <Button variant="secondary" onClick={handlePrint}>
          Print
        </Button>
        <Button variant="ghost" onClick={() => setShowGrid(!showGrid)}>
          {showGrid ? 'Hide Grid' : 'Show Grid'}
        </Button>
        <span className="text-xs text-stone-400 ml-2">
          {elements.length} element{elements.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Element Palette */}
        <Card className="p-3 lg:w-48 flex-shrink-0">
          <h3 className="text-sm font-semibold text-stone-300 mb-2">Add Elements</h3>
          <div className="grid grid-cols-3 lg:grid-cols-2 gap-1.5">
            {ELEMENT_TYPES.map((t) => (
              <button
                key={t.type}
                onClick={() => addElement(t.type)}
                className="flex flex-col items-center gap-0.5 p-2 rounded hover:bg-stone-700/50 transition-colors text-center"
                title={t.label}
              >
                <span
                  className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: t.color }}
                >
                  {t.icon}
                </span>
                <span className="text-[10px] text-stone-400 leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Canvas */}
        <div className="flex-1 overflow-auto">
          <div
            ref={canvasRef}
            className="relative border border-stone-600 rounded-lg"
            style={{
              width: floorPlan.canvas_width,
              height: floorPlan.canvas_height,
              minWidth: floorPlan.canvas_width,
              minHeight: floorPlan.canvas_height,
              background: '#1a1a2e',
            }}
            onClick={handleCanvasClick}
          >
            {/* Grid lines */}
            {showGrid && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={floorPlan.canvas_width}
                height={floorPlan.canvas_height}
              >
                {Array.from({ length: Math.floor(floorPlan.canvas_width / 20) + 1 }).map((_, i) => (
                  <line
                    key={`v${i}`}
                    x1={i * 20}
                    y1={0}
                    x2={i * 20}
                    y2={floorPlan.canvas_height}
                    stroke="#ffffff08"
                    strokeWidth={1}
                  />
                ))}
                {Array.from({ length: Math.floor(floorPlan.canvas_height / 20) + 1 }).map(
                  (_, i) => (
                    <line
                      key={`h${i}`}
                      x1={0}
                      y1={i * 20}
                      x2={floorPlan.canvas_width}
                      y2={i * 20}
                      stroke="#ffffff08"
                      strokeWidth={1}
                    />
                  )
                )}
              </svg>
            )}

            {/* Elements */}
            {elements.map((el) => {
              const isSelected = el.id === selectedId
              const isRound = el.type === 'table_round' || el.type === 'dance_floor'
              return (
                <div
                  key={el.id}
                  className="absolute cursor-grab active:cursor-grabbing select-none"
                  style={{
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                    backgroundColor: el.color + '33',
                    border: `2px solid ${isSelected ? '#fff' : el.color}`,
                    borderRadius: isRound ? '50%' : '4px',
                    transform: `rotate(${el.rotation}deg)`,
                    zIndex: isSelected ? 10 : 1,
                    boxShadow: isSelected ? '0 0 0 2px rgba(255,255,255,0.4)' : undefined,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, el.id)}
                  onTouchStart={(e) => handleTouchStart(e, el.id)}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedId(el.id)
                  }}
                >
                  <div className="flex items-center justify-center w-full h-full text-center px-1">
                    <span className="text-[10px] text-white font-medium leading-tight truncate">
                      {el.label}
                      {el.seats ? ` (${el.seats})` : ''}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Properties Panel */}
        {selectedElement && (
          <Card className="p-3 lg:w-56 flex-shrink-0 space-y-3">
            <h3 className="text-sm font-semibold text-stone-300">Properties</h3>

            <Input
              label="Label"
              value={selectedElement.label}
              onChange={(e) => updateElement(selectedId!, { label: e.target.value })}
            />

            {selectedElement.type.startsWith('table') && (
              <Input
                label="Seats"
                type="number"
                min="1"
                value={selectedElement.seats?.toString() ?? ''}
                onChange={(e) =>
                  updateElement(selectedId!, { seats: parseInt(e.target.value) || undefined })
                }
              />
            )}

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Width"
                type="number"
                min="20"
                value={selectedElement.width.toString()}
                onChange={(e) =>
                  updateElement(selectedId!, {
                    width: Math.max(20, parseInt(e.target.value) || 20),
                  })
                }
              />
              <Input
                label="Height"
                type="number"
                min="20"
                value={selectedElement.height.toString()}
                onChange={(e) =>
                  updateElement(selectedId!, {
                    height: Math.max(20, parseInt(e.target.value) || 20),
                  })
                }
              />
            </div>

            <Input
              label="Rotation"
              type="number"
              min="0"
              max="360"
              value={selectedElement.rotation.toString()}
              onChange={(e) =>
                updateElement(selectedId!, { rotation: parseInt(e.target.value) || 0 })
              }
            />

            <div>
              <label className="block text-xs text-stone-400 mb-1">Color</label>
              <input
                type="color"
                value={selectedElement.color}
                onChange={(e) => updateElement(selectedId!, { color: e.target.value })}
                className="w-full h-8 rounded border border-stone-600 cursor-pointer bg-transparent"
              />
            </div>

            <Button variant="danger" className="w-full" onClick={() => deleteElement(selectedId!)}>
              Delete Element
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
