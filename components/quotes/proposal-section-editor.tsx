// Proposal Section Editor
// Renders the appropriate editor for each section type
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ProposalSection } from '@/lib/quotes/proposal-builder-actions'

type SectionEditorProps = {
  section: ProposalSection
  onUpdate: (section: ProposalSection) => void
}

// ============================================
// COVER SECTION EDITOR
// ============================================

function CoverEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as {
    subtitle?: string
    logo_url?: string
    event_name?: string
    event_date?: string
  }

  function updateContent(field: string, value: string) {
    onUpdate({
      ...section,
      content: { ...content, [field]: value },
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
        <Input
          value={content.event_name ?? ''}
          onChange={(e) => updateContent('event_name', e.target.value)}
          placeholder="e.g., Johnson Anniversary Dinner"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
        <Input
          value={content.subtitle ?? ''}
          onChange={(e) => updateContent('subtitle', e.target.value)}
          placeholder="e.g., A curated dining experience"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
        <Input
          type="date"
          value={content.event_date ?? ''}
          onChange={(e) => updateContent('event_date', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
        <Input
          value={content.logo_url ?? ''}
          onChange={(e) => updateContent('logo_url', e.target.value)}
          placeholder="https://your-logo-url.com/logo.png"
        />
        <p className="text-xs text-gray-500 mt-1">
          Paste a URL for your logo. Image upload coming soon.
        </p>
      </div>
    </div>
  )
}

// ============================================
// MENU SECTION EDITOR
// ============================================

function MenuEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as {
    description?: string
    courses?: Array<{ name: string; items: string[] }>
  }

  function updateDescription(value: string) {
    onUpdate({
      ...section,
      content: { ...content, description: value },
    })
  }

  function updateCourse(idx: number, field: 'name' | 'items', value: string | string[]) {
    const courses = [...(content.courses ?? [])]
    courses[idx] = { ...courses[idx], [field]: value }
    onUpdate({
      ...section,
      content: { ...content, courses },
    })
  }

  function addCourse() {
    const courses = [...(content.courses ?? []), { name: '', items: [''] }]
    onUpdate({
      ...section,
      content: { ...content, courses },
    })
  }

  function removeCourse(idx: number) {
    const courses = (content.courses ?? []).filter((_, i) => i !== idx)
    onUpdate({
      ...section,
      content: { ...content, courses },
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Menu Description</label>
        <Textarea
          value={content.description ?? ''}
          onChange={(e) => updateDescription(e.target.value)}
          placeholder="Describe the overall menu concept..."
          rows={2}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Courses</label>
          <button
            type="button"
            onClick={addCourse}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            + Add Course
          </button>
        </div>

        {(content.courses ?? []).map((course, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={course.name}
                onChange={(e) => updateCourse(idx, 'name', e.target.value)}
                placeholder={`Course ${idx + 1} name (e.g., First Course)`}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeCourse(idx)}
                className="text-red-500 hover:text-red-700 text-sm px-2"
              >
                Remove
              </button>
            </div>
            <Textarea
              value={(course.items ?? []).join('\n')}
              onChange={(e) =>
                updateCourse(idx, 'items', e.target.value.split('\n').filter(Boolean))
              }
              placeholder="One item per line"
              rows={3}
            />
          </div>
        ))}

        {(!content.courses || content.courses.length === 0) && (
          <p className="text-sm text-gray-500 italic">
            No courses added yet. Menu items will be pulled from the event menu if available.
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================
// PRICING SECTION EDITOR
// ============================================

function PricingEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as {
    show_line_items?: boolean
    show_total?: boolean
    custom_note?: string
    line_items?: Array<{ label: string; amount_cents: number }>
  }

  function updateField(field: string, value: unknown) {
    onUpdate({
      ...section,
      content: { ...content, [field]: value },
    })
  }

  function updateLineItem(idx: number, field: 'label' | 'amount_cents', value: string | number) {
    const items = [...(content.line_items ?? [])]
    items[idx] = { ...items[idx], [field]: value }
    onUpdate({
      ...section,
      content: { ...content, line_items: items },
    })
  }

  function addLineItem() {
    const items = [...(content.line_items ?? []), { label: '', amount_cents: 0 }]
    onUpdate({
      ...section,
      content: { ...content, line_items: items },
    })
  }

  function removeLineItem(idx: number) {
    const items = (content.line_items ?? []).filter((_, i) => i !== idx)
    onUpdate({
      ...section,
      content: { ...content, line_items: items },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={content.show_line_items ?? true}
            onChange={(e) => updateField('show_line_items', e.target.checked)}
            className="rounded border-gray-300"
          />
          Show line items
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={content.show_total ?? true}
            onChange={(e) => updateField('show_total', e.target.checked)}
            className="rounded border-gray-300"
          />
          Show total
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Custom Line Items</label>
          <button
            type="button"
            onClick={addLineItem}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            + Add Item
          </button>
        </div>

        {(content.line_items ?? []).map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              value={item.label}
              onChange={(e) => updateLineItem(idx, 'label', e.target.value)}
              placeholder="Item description"
              className="flex-1"
            />
            <Input
              type="number"
              value={item.amount_cents / 100}
              onChange={(e) =>
                updateLineItem(idx, 'amount_cents', Math.round(parseFloat(e.target.value || '0') * 100))
              }
              placeholder="0.00"
              className="w-28"
              step="0.01"
            />
            <button
              type="button"
              onClick={() => removeLineItem(idx)}
              className="text-red-500 hover:text-red-700 text-sm px-2"
            >
              X
            </button>
          </div>
        ))}

        <p className="text-xs text-gray-500">
          Pricing from the quote will be pulled automatically. Add custom items to supplement.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Note</label>
        <Textarea
          value={content.custom_note ?? ''}
          onChange={(e) => updateField('custom_note', e.target.value)}
          placeholder="e.g., Deposit of 50% required to secure your date..."
          rows={2}
        />
      </div>
    </div>
  )
}

// ============================================
// TERMS SECTION EDITOR
// ============================================

function TermsEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as { text?: string }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
      <Textarea
        value={content.text ?? ''}
        onChange={(e) =>
          onUpdate({ ...section, content: { ...content, text: e.target.value } })
        }
        placeholder="Enter your standard terms and conditions..."
        rows={8}
      />
      <p className="text-xs text-gray-500 mt-1">
        These will default from your template if you have one saved.
      </p>
    </div>
  )
}

// ============================================
// PHOTOS SECTION EDITOR
// ============================================

function PhotosEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as {
    photo_urls?: string[]
    caption?: string
  }

  function updatePhotos(value: string) {
    const urls = value
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean)
    onUpdate({
      ...section,
      content: { ...content, photo_urls: urls },
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Photo URLs</label>
        <Textarea
          value={(content.photo_urls ?? []).join('\n')}
          onChange={(e) => updatePhotos(e.target.value)}
          placeholder="One URL per line"
          rows={4}
        />
        <p className="text-xs text-gray-500 mt-1">
          Paste image URLs, one per line. Direct upload coming in a future update.
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
        <Input
          value={content.caption ?? ''}
          onChange={(e) =>
            onUpdate({ ...section, content: { ...content, caption: e.target.value } })
          }
          placeholder="e.g., A selection of past events"
        />
      </div>
    </div>
  )
}

// ============================================
// BIO SECTION EDITOR
// ============================================

function BioEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as {
    name?: string
    description?: string
    photo_url?: string
  }

  function updateField(field: string, value: string) {
    onUpdate({
      ...section,
      content: { ...content, [field]: value },
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Chef Name</label>
        <Input
          value={content.name ?? ''}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Your name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bio / Description</label>
        <Textarea
          value={content.description ?? ''}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Tell the client about yourself, your background, and your culinary philosophy..."
          rows={5}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL</label>
        <Input
          value={content.photo_url ?? ''}
          onChange={(e) => updateField('photo_url', e.target.value)}
          placeholder="https://your-photo-url.com/headshot.jpg"
        />
      </div>
    </div>
  )
}

// ============================================
// CUSTOM SECTION EDITOR
// ============================================

function CustomEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as { body?: string }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
        <Input
          value={section.title}
          onChange={(e) => onUpdate({ ...section, title: e.target.value })}
          placeholder="Section title"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
        <Textarea
          value={content.body ?? ''}
          onChange={(e) =>
            onUpdate({ ...section, content: { ...content, body: e.target.value } })
          }
          placeholder="Write your custom content here..."
          rows={6}
        />
      </div>
    </div>
  )
}

// ============================================
// MAIN EDITOR DISPATCHER
// ============================================

export function ProposalSectionEditor({ section, onUpdate }: SectionEditorProps) {
  switch (section.type) {
    case 'cover':
      return <CoverEditor section={section} onUpdate={onUpdate} />
    case 'menu':
      return <MenuEditor section={section} onUpdate={onUpdate} />
    case 'pricing':
      return <PricingEditor section={section} onUpdate={onUpdate} />
    case 'terms':
      return <TermsEditor section={section} onUpdate={onUpdate} />
    case 'photos':
      return <PhotosEditor section={section} onUpdate={onUpdate} />
    case 'bio':
      return <BioEditor section={section} onUpdate={onUpdate} />
    case 'custom':
      return <CustomEditor section={section} onUpdate={onUpdate} />
    default:
      return <p className="text-sm text-gray-500">Unknown section type</p>
  }
}
