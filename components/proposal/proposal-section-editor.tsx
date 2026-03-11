'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Type,
  UtensilsCrossed,
  Images,
  Quote,
  Minus,
  GripVertical,
  Pencil,
  X,
  Check,
} from 'lucide-react'
import type { ProposalSection, SectionType } from '@/lib/proposal/types'
import {
  upsertProposalSection,
  deleteProposalSection,
  reorderProposalSections,
} from '@/lib/proposal/actions'

type ProposalSectionEditorProps = {
  quoteId: string
  sections: ProposalSection[]
  onSectionsChange: (sections: ProposalSection[]) => void
}

const SECTION_TYPE_OPTIONS: { type: SectionType; label: string; icon: React.ReactNode }[] = [
  { type: 'hero', label: 'Hero Image', icon: <ImageIcon className="h-4 w-4" /> },
  { type: 'menu', label: 'Menu', icon: <UtensilsCrossed className="h-4 w-4" /> },
  { type: 'text', label: 'Text Block', icon: <Type className="h-4 w-4" /> },
  { type: 'gallery', label: 'Photo Gallery', icon: <Images className="h-4 w-4" /> },
  { type: 'testimonial', label: 'Testimonial', icon: <Quote className="h-4 w-4" /> },
  { type: 'divider', label: 'Divider', icon: <Minus className="h-4 w-4" /> },
]

function getSectionIcon(type: SectionType) {
  const option = SECTION_TYPE_OPTIONS.find((o) => o.type === type)
  return option?.icon || <Type className="h-4 w-4" />
}

function getSectionLabel(type: SectionType) {
  const option = SECTION_TYPE_OPTIONS.find((o) => o.type === type)
  return option?.label || type
}

export function ProposalSectionEditor({
  quoteId,
  sections,
  onSectionsChange,
}: ProposalSectionEditorProps) {
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // --- Add Section ---
  const handleAddSection = useCallback(
    (type: SectionType) => {
      setShowTypePicker(false)
      const tempId = `temp-${Date.now()}`
      const newSection: ProposalSection = {
        id: tempId,
        quoteId,
        sectionType: type,
        title: type === 'divider' ? null : '',
        bodyText: null,
        photoUrl: null,
        photoUrls: [],
        sortOrder: sections.length,
        isVisible: true,
      }

      const updated = [...sections, newSection]
      onSectionsChange(updated)
      setEditingId(tempId)
    },
    [quoteId, sections, onSectionsChange]
  )

  // --- Save Section ---
  const handleSave = useCallback(
    (section: ProposalSection) => {
      startTransition(async () => {
        try {
          const saved = await upsertProposalSection(quoteId, {
            id: section.id.startsWith('temp-') ? undefined : section.id,
            sectionType: section.sectionType,
            title: section.title,
            bodyText: section.bodyText,
            photoUrl: section.photoUrl,
            photoUrls: section.photoUrls,
            sortOrder: section.sortOrder,
            isVisible: section.isVisible,
          })

          const updated = sections.map((s) =>
            s.id === section.id ? { ...section, id: saved.id } : s
          )
          onSectionsChange(updated)
          setEditingId(null)
        } catch (err) {
          console.error('[ProposalSectionEditor] Save failed:', err)
        }
      })
    },
    [quoteId, sections, onSectionsChange]
  )

  // --- Delete Section ---
  const handleDelete = useCallback(
    (sectionId: string) => {
      const updated = sections.filter((s) => s.id !== sectionId)
      onSectionsChange(updated)

      if (!sectionId.startsWith('temp-')) {
        startTransition(async () => {
          try {
            await deleteProposalSection(sectionId)
          } catch (err) {
            console.error('[ProposalSectionEditor] Delete failed:', err)
          }
        })
      }
    },
    [sections, onSectionsChange]
  )

  // --- Move Section ---
  const handleMove = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= sections.length) return

      const updated = [...sections]
      const [moved] = updated.splice(index, 1)
      updated.splice(newIndex, 0, moved)

      // Update sort orders
      const reordered = updated.map((s, i) => ({ ...s, sortOrder: i }))
      onSectionsChange(reordered)

      // Persist reorder
      const nonTempIds = reordered.filter((s) => !s.id.startsWith('temp-')).map((s) => s.id)

      if (nonTempIds.length > 0) {
        startTransition(async () => {
          try {
            await reorderProposalSections(quoteId, nonTempIds)
          } catch (err) {
            console.error('[ProposalSectionEditor] Reorder failed:', err)
          }
        })
      }
    },
    [quoteId, sections, onSectionsChange]
  )

  // --- Toggle Visibility ---
  const handleToggleVisibility = useCallback(
    (sectionId: string) => {
      const updated = sections.map((s) =>
        s.id === sectionId ? { ...s, isVisible: !s.isVisible } : s
      )
      onSectionsChange(updated)

      const section = updated.find((s) => s.id === sectionId)
      if (section && !section.id.startsWith('temp-')) {
        startTransition(async () => {
          try {
            await upsertProposalSection(quoteId, {
              id: section.id,
              sectionType: section.sectionType,
              title: section.title,
              bodyText: section.bodyText,
              photoUrl: section.photoUrl,
              photoUrls: section.photoUrls,
              sortOrder: section.sortOrder,
              isVisible: section.isVisible,
            })
          } catch (err) {
            console.error('[ProposalSectionEditor] Toggle visibility failed:', err)
          }
        })
      }
    },
    [quoteId, sections, onSectionsChange]
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Proposal Sections
        </h3>
        <span className="text-xs text-gray-400">{sections.length} sections</span>
      </div>

      {/* Section list */}
      {sections.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
          No sections yet. Add your first section below.
        </div>
      )}

      {sections.map((section, index) => (
        <div
          key={section.id}
          className={`
            rounded-lg border transition-colors
            ${editingId === section.id ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-white'}
            ${!section.isVisible ? 'opacity-50' : ''}
          `}
        >
          {/* Section header bar */}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-gray-400 shrink-0">{getSectionIcon(section.sectionType)}</span>
              <span className="text-sm font-medium text-gray-700 truncate">
                {section.title || getSectionLabel(section.sectionType)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleMove(index, 'up')}
                disabled={index === 0}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, 'down')}
                disabled={index === sections.length - 1}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleVisibility(section.id)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title={section.isVisible ? 'Hide section' : 'Show section'}
              >
                {section.isVisible ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setEditingId(editingId === section.id ? null : section.id)}
                className="p-1 text-gray-400 hover:text-amber-600"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(section.id)}
                className="p-1 text-gray-400 hover:text-red-500"
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Inline editor */}
          {editingId === section.id && (
            <SectionInlineEditor
              section={section}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
              isPending={isPending}
              onUpdate={(updated) => {
                const newSections = sections.map((s) => (s.id === section.id ? updated : s))
                onSectionsChange(newSections)
              }}
            />
          )}
        </div>
      ))}

      {/* Add section button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowTypePicker(!showTypePicker)}
          className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 hover:border-amber-400 px-4 py-3 text-sm text-gray-500 hover:text-amber-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Section
        </button>

        {showTypePicker && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl border border-gray-200 shadow-lg p-2 z-10">
            <div className="grid grid-cols-2 gap-1">
              {SECTION_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => handleAddSection(option.type)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-200 transition-colors text-left"
                >
                  <span className="text-gray-400">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Inline Editor for a single section ---

function SectionInlineEditor({
  section,
  onSave,
  onCancel,
  isPending,
  onUpdate,
}: {
  section: ProposalSection
  onSave: (section: ProposalSection) => void
  onCancel: () => void
  isPending: boolean
  onUpdate: (section: ProposalSection) => void
}) {
  const showTitle = section.sectionType !== 'divider'
  const showBody = section.sectionType === 'text' || section.sectionType === 'testimonial'
  const showPhoto = section.sectionType === 'hero' || section.sectionType === 'gallery'
  const showPhotoUrls = section.sectionType === 'gallery'

  return (
    <div className="border-t border-gray-100 px-3 py-3 space-y-3">
      {showTitle && (
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Title</label>
          <input
            type="text"
            value={section.title || ''}
            onChange={(e) => onUpdate({ ...section, title: e.target.value })}
            placeholder={`${getSectionLabel(section.sectionType)} title`}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
          />
        </div>
      )}

      {showBody && (
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Content</label>
          <textarea
            value={section.bodyText || ''}
            onChange={(e) => onUpdate({ ...section, bodyText: e.target.value })}
            placeholder={
              section.sectionType === 'testimonial'
                ? '"A testimonial from a past client..."'
                : 'Section content...'
            }
            rows={4}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none resize-y"
          />
        </div>
      )}

      {showPhoto && !showPhotoUrls && (
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Photo URL</label>
          <input
            type="url"
            value={section.photoUrl || ''}
            onChange={(e) => onUpdate({ ...section, photoUrl: e.target.value })}
            placeholder="https://..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
          />
          {section.photoUrl && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={section.photoUrl}
                alt="Preview"
                className="h-24 w-auto rounded-lg object-cover border border-gray-200"
              />
            </div>
          )}
        </div>
      )}

      {showPhotoUrls && (
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Photo URLs (one per line)
          </label>
          <textarea
            value={(section.photoUrls || []).join('\n')}
            onChange={(e) =>
              onUpdate({
                ...section,
                photoUrls: e.target.value.split('\n').filter((u) => u.trim()),
              })
            }
            placeholder="https://...\nhttps://..."
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none resize-y font-mono"
          />
          {section.photoUrls && section.photoUrls.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {section.photoUrls.slice(0, 4).map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`Preview ${i + 1}`}
                  className="h-16 w-16 rounded-lg object-cover border border-gray-200 shrink-0"
                />
              ))}
              {section.photoUrls.length > 4 && (
                <span className="text-xs text-gray-400 self-center">
                  +{section.photoUrls.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Save / Cancel */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSave(section)}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          <Check className="h-3.5 w-3.5" />
          {isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
    </div>
  )
}
