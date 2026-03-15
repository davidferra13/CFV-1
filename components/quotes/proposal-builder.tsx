// Proposal Builder
// Drag-and-drop section list with reordering, visibility toggles, and live preview
'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ProposalSectionEditor } from './proposal-section-editor'
import { ProposalLivePreview } from './proposal-live-preview'
import type {
  ProposalSection,
  ProposalSectionType,
  ProposalTemplate,
} from '@/lib/quotes/proposal-builder-actions'

// ============================================
// TYPES
// ============================================

type ProposalBuilderProps = {
  initialSections: ProposalSection[]
  branding: ProposalTemplate['branding']
  onSave: (sections: ProposalSection[]) => Promise<void>
  onPublish?: () => Promise<void>
  saving?: boolean
}

const SECTION_TYPE_LABELS: Record<ProposalSectionType, string> = {
  cover: 'Cover Page',
  menu: 'Menu',
  pricing: 'Pricing',
  terms: 'Terms & Conditions',
  photos: 'Photo Gallery',
  bio: 'Chef Bio',
  custom: 'Custom Section',
}

const SECTION_TYPE_ICONS: Record<ProposalSectionType, string> = {
  cover: '\u25A0',   // square
  menu: '\u2630',    // trigram
  pricing: '$',
  terms: '\u00A7',   // section sign
  photos: '\u25A3',  // square with fill
  bio: '\u263A',     // smiley
  custom: '\u270E',  // pencil
}

// ============================================
// DRAG-AND-DROP (CSS-based, no external lib)
// ============================================

function useDragReorder(
  sections: ProposalSection[],
  onReorder: (sections: ProposalSection[]) => void
) {
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index
  }, [])

  const handleDragEnter = useCallback((index: number) => {
    dragOverItem.current = index
  }, [])

  const handleDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null
      dragOverItem.current = null
      return
    }

    const reordered = [...sections]
    const [removed] = reordered.splice(dragItem.current, 1)
    reordered.splice(dragOverItem.current, 0, removed)

    // Update order indices
    const withOrder = reordered.map((s, idx) => ({ ...s, order: idx }))

    dragItem.current = null
    dragOverItem.current = null

    onReorder(withOrder)
  }, [sections, onReorder])

  return { handleDragStart, handleDragEnter, handleDragEnd }
}

// ============================================
// SECTION CARD
// ============================================

function SectionCard({
  section,
  index,
  isExpanded,
  onToggleExpand,
  onToggleVisibility,
  onUpdate,
  onRemove,
  dragHandlers,
}: {
  section: ProposalSection
  index: number
  isExpanded: boolean
  onToggleExpand: () => void
  onToggleVisibility: () => void
  onUpdate: (section: ProposalSection) => void
  onRemove: () => void
  dragHandlers: {
    handleDragStart: (index: number) => void
    handleDragEnter: (index: number) => void
    handleDragEnd: () => void
  }
}) {
  return (
    <div
      draggable
      onDragStart={() => dragHandlers.handleDragStart(index)}
      onDragEnter={() => dragHandlers.handleDragEnter(index)}
      onDragEnd={dragHandlers.handleDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`border rounded-lg transition-all ${
        section.visible
          ? 'border-gray-200 bg-white'
          : 'border-gray-100 bg-gray-50 opacity-60'
      }`}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Drag handle */}
        <div
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 select-none px-1"
          title="Drag to reorder"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </div>

        {/* Section icon + title */}
        <span className="text-sm text-gray-500 w-5 text-center">
          {SECTION_TYPE_ICONS[section.type]}
        </span>
        <button
          onClick={onToggleExpand}
          className="flex-1 text-left text-sm font-medium text-gray-900 hover:text-indigo-600"
        >
          {section.title || SECTION_TYPE_LABELS[section.type]}
        </button>

        {/* Visibility toggle */}
        <button
          onClick={onToggleVisibility}
          className={`text-xs px-2 py-1 rounded ${
            section.visible
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
          title={section.visible ? 'Visible in proposal' : 'Hidden from proposal'}
        >
          {section.visible ? 'Visible' : 'Hidden'}
        </button>

        {/* Expand/collapse */}
        <button
          onClick={onToggleExpand}
          className="text-gray-400 hover:text-gray-600 px-1"
        >
          {isExpanded ? '\u25B2' : '\u25BC'}
        </button>

        {/* Remove */}
        {section.type === 'custom' && (
          <button
            onClick={onRemove}
            className="text-red-400 hover:text-red-600 px-1 text-sm"
            title="Remove section"
          >
            X
          </button>
        )}
      </div>

      {/* Section editor (collapsible) */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-gray-100">
          <ProposalSectionEditor section={section} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  )
}

// ============================================
// ADD SECTION PICKER
// ============================================

function AddSectionPicker({ onAdd }: { onAdd: (type: ProposalSectionType) => void }) {
  const [open, setOpen] = useState(false)

  const types: ProposalSectionType[] = [
    'cover',
    'menu',
    'pricing',
    'terms',
    'photos',
    'bio',
    'custom',
  ]

  return (
    <div className="relative">
      <Button
        variant="secondary"
        onClick={() => setOpen(!open)}
        className="w-full"
      >
        + Add Section
      </Button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => {
                onAdd(type)
                setOpen(false)
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <span className="text-gray-400 w-5 text-center">
                {SECTION_TYPE_ICONS[type]}
              </span>
              {SECTION_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// MAIN PROPOSAL BUILDER
// ============================================

export function ProposalBuilder({
  initialSections,
  branding,
  onSave,
  onPublish,
  saving,
}: ProposalBuilderProps) {
  const [sections, setSections] = useState<ProposalSection[]>(initialSections)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'none' | 'side-by-side' | 'fullscreen'>('none')
  const [dirty, setDirty] = useState(false)

  const updateSections = useCallback((updated: ProposalSection[]) => {
    setSections(updated)
    setDirty(true)
  }, [])

  const dragHandlers = useDragReorder(sections, updateSections)

  // Update a single section
  const handleUpdateSection = useCallback(
    (updated: ProposalSection) => {
      updateSections(sections.map((s) => (s.id === updated.id ? updated : s)))
    },
    [sections, updateSections]
  )

  // Toggle section visibility
  const handleToggleVisibility = useCallback(
    (id: string) => {
      updateSections(
        sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s))
      )
    },
    [sections, updateSections]
  )

  // Remove a section
  const handleRemoveSection = useCallback(
    (id: string) => {
      updateSections(sections.filter((s) => s.id !== id).map((s, idx) => ({ ...s, order: idx })))
    },
    [sections, updateSections]
  )

  // Add a new section
  const handleAddSection = useCallback(
    (type: ProposalSectionType) => {
      const newSection: ProposalSection = {
        id: crypto.randomUUID(),
        type,
        title: SECTION_TYPE_LABELS[type],
        content: type === 'custom' ? { body: '' } : {},
        order: sections.length,
        visible: true,
      }
      updateSections([...sections, newSection])
      setExpandedId(newSection.id)
    },
    [sections, updateSections]
  )

  // Save
  const handleSave = useCallback(async () => {
    try {
      await onSave(sections)
      setDirty(false)
    } catch (err) {
      console.error('[proposal-builder] Save failed:', err)
    }
  }, [sections, onSave])

  // Side-by-side layout
  const showSideBySide = previewMode === 'side-by-side'

  return (
    <div className="relative">
      {/* Top toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Proposal Builder</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() =>
              setPreviewMode(
                previewMode === 'side-by-side' ? 'none' : 'side-by-side'
              )
            }
          >
            {showSideBySide ? 'Hide Preview' : 'Side-by-Side'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setPreviewMode('fullscreen')}
          >
            Full Preview
          </Button>
          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? 'Saving...' : dirty ? 'Save Draft' : 'Saved'}
          </Button>
          {onPublish && (
            <Button variant="primary" onClick={onPublish}>
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className={showSideBySide ? 'grid grid-cols-2 gap-6' : ''}>
        {/* Section list */}
        <div className="space-y-2">
          {sections
            .sort((a, b) => a.order - b.order)
            .map((section, index) => (
              <SectionCard
                key={section.id}
                section={section}
                index={index}
                isExpanded={expandedId === section.id}
                onToggleExpand={() =>
                  setExpandedId(expandedId === section.id ? null : section.id)
                }
                onToggleVisibility={() => handleToggleVisibility(section.id)}
                onUpdate={handleUpdateSection}
                onRemove={() => handleRemoveSection(section.id)}
                dragHandlers={dragHandlers}
              />
            ))}

          <AddSectionPicker onAdd={handleAddSection} />
        </div>

        {/* Side-by-side preview */}
        {showSideBySide && (
          <ProposalLivePreview
            sections={sections}
            branding={branding}
            mode="side-by-side"
          />
        )}
      </div>

      {/* Fullscreen preview overlay */}
      {previewMode === 'fullscreen' && (
        <ProposalLivePreview
          sections={sections}
          branding={branding}
          mode="fullscreen"
          onClose={() => setPreviewMode('none')}
        />
      )}
    </div>
  )
}
