/* eslint-disable @next/next/no-img-element */
// Proposal Live Preview
// Renders the proposal as the client will see it, with print-friendly layout
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ProposalSection, ProposalTemplate } from '@/lib/quotes/proposal-builder-actions'

type PreviewProps = {
  sections: ProposalSection[]
  branding: ProposalTemplate['branding']
  mode: 'side-by-side' | 'fullscreen'
  onClose?: () => void
}

// ============================================
// SECTION RENDERERS
// ============================================

function CoverPreview({
  section,
  branding,
}: {
  section: ProposalSection
  branding: ProposalTemplate['branding']
}) {
  const content = section.content as {
    event_name?: string
    subtitle?: string
    event_date?: string
    logo_url?: string
  }

  const primaryColor = branding.primary_color || '#1e293b'

  return (
    <div
      className="text-center py-16 px-8 print:py-24"
      style={{ backgroundColor: primaryColor, color: '#ffffff' }}
    >
      {(content.logo_url || branding.logo_url) && (
        <img
          src={content.logo_url || branding.logo_url}
          alt="Logo"
          className="mx-auto h-16 mb-6 object-contain"
        />
      )}
      {branding.business_name && (
        <p className="text-sm uppercase tracking-widest opacity-80 mb-2">
          {branding.business_name}
        </p>
      )}
      <h1 className="text-3xl font-bold mb-3">{content.event_name || 'Your Event'}</h1>
      {content.subtitle && <p className="text-lg opacity-90">{content.subtitle}</p>}
      {content.event_date && (
        <p className="mt-4 text-sm opacity-70">
          {new Date(content.event_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      )}
      {branding.tagline && (
        <p className="mt-6 text-xs uppercase tracking-wider opacity-60">{branding.tagline}</p>
      )}
    </div>
  )
}

function MenuPreview({ section }: { section: ProposalSection }) {
  const content = section.content as {
    description?: string
    courses?: Array<{ name: string; items: string[] }>
  }

  return (
    <div className="py-8 px-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b pb-2">{section.title}</h2>
      {content.description && <p className="text-gray-600 mb-6 italic">{content.description}</p>}
      {(content.courses ?? []).length > 0 ? (
        <div className="space-y-6">
          {content.courses!.map((course, idx) => (
            <div key={idx}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2">
                {course.name || `Course ${idx + 1}`}
              </h3>
              <ul className="space-y-1">
                {course.items.map((item, iIdx) => (
                  <li key={iIdx} className="text-gray-800">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 italic text-sm">Menu items will appear here</p>
      )}
    </div>
  )
}

function PricingPreview({ section }: { section: ProposalSection }) {
  const content = section.content as {
    show_line_items?: boolean
    show_total?: boolean
    custom_note?: string
    line_items?: Array<{ label: string; amount_cents: number }>
  }

  const items = content.line_items ?? []
  const total = items.reduce((sum, item) => sum + (item.amount_cents || 0), 0)

  return (
    <div className="py-8 px-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b pb-2">{section.title}</h2>

      {content.show_line_items !== false && items.length > 0 && (
        <div className="space-y-2 mb-4">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-gray-800">
              <span>{item.label || 'Item'}</span>
              <span className="font-medium">${(item.amount_cents / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {content.show_total !== false && items.length > 0 && (
        <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-3 mt-3">
          <span>Total</span>
          <span>${(total / 100).toFixed(2)}</span>
        </div>
      )}

      {items.length === 0 && (
        <p className="text-gray-400 italic text-sm">
          Pricing details will be pulled from the quote
        </p>
      )}

      {content.custom_note && <p className="text-sm text-gray-600 mt-4">{content.custom_note}</p>}
    </div>
  )
}

function TermsPreview({ section }: { section: ProposalSection }) {
  const content = section.content as { text?: string }

  return (
    <div className="py-8 px-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b pb-2">{section.title}</h2>
      {content.text ? (
        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {content.text}
        </div>
      ) : (
        <p className="text-gray-400 italic text-sm">Terms will appear here</p>
      )}
    </div>
  )
}

function PhotosPreview({ section }: { section: ProposalSection }) {
  const content = section.content as {
    photo_urls?: string[]
    caption?: string
  }

  const photos = content.photo_urls ?? []

  return (
    <div className="py-8 px-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b pb-2">{section.title}</h2>
      {photos.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Photo ${idx + 1}`}
                className="rounded-lg w-full h-48 object-cover"
              />
            ))}
          </div>
          {content.caption && (
            <p className="text-sm text-gray-500 text-center mt-3 italic">{content.caption}</p>
          )}
        </>
      ) : (
        <p className="text-gray-400 italic text-sm">Photos will appear here</p>
      )}
    </div>
  )
}

function BioPreview({ section }: { section: ProposalSection }) {
  const content = section.content as {
    name?: string
    description?: string
    photo_url?: string
  }

  return (
    <div className="py-8 px-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b pb-2">{section.title}</h2>
      <div className="flex gap-6 items-start">
        {content.photo_url && (
          <img
            src={content.photo_url}
            alt={content.name || 'Chef'}
            className="w-24 h-24 rounded-full object-cover flex-shrink-0"
          />
        )}
        <div>
          {content.name && (
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{content.name}</h3>
          )}
          {content.description ? (
            <p className="text-gray-700 whitespace-pre-wrap">{content.description}</p>
          ) : (
            <p className="text-gray-400 italic text-sm">Chef bio will appear here</p>
          )}
        </div>
      </div>
    </div>
  )
}

function CustomPreview({ section }: { section: ProposalSection }) {
  const content = section.content as { body?: string }

  return (
    <div className="py-8 px-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 border-b pb-2">{section.title}</h2>
      {content.body ? (
        <div className="text-gray-700 whitespace-pre-wrap">{content.body}</div>
      ) : (
        <p className="text-gray-400 italic text-sm">Content will appear here</p>
      )}
    </div>
  )
}

// ============================================
// SECTION RENDERER DISPATCHER
// ============================================

function RenderSection({
  section,
  branding,
}: {
  section: ProposalSection
  branding: ProposalTemplate['branding']
}) {
  switch (section.type) {
    case 'cover':
      return <CoverPreview section={section} branding={branding} />
    case 'menu':
      return <MenuPreview section={section} />
    case 'pricing':
      return <PricingPreview section={section} />
    case 'terms':
      return <TermsPreview section={section} />
    case 'photos':
      return <PhotosPreview section={section} />
    case 'bio':
      return <BioPreview section={section} />
    case 'custom':
      return <CustomPreview section={section} />
    default:
      return null
  }
}

// ============================================
// MAIN PREVIEW COMPONENT
// ============================================

export function ProposalLivePreview({ sections, branding, mode, onClose }: PreviewProps) {
  const visibleSections = sections.filter((s) => s.visible).sort((a, b) => a.order - b.order)

  const containerClass =
    mode === 'fullscreen'
      ? 'fixed inset-0 z-50 bg-white overflow-y-auto print:static print:z-auto'
      : 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-y-auto max-h-[calc(100vh-200px)]'

  return (
    <div className={containerClass}>
      {/* Toolbar (hidden when printing) */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b px-4 py-2 flex items-center justify-between print:hidden">
        <span className="text-sm font-medium text-gray-600">Preview</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => window.print()}>
            Print / PDF
          </Button>
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Proposal content */}
      <div className="max-w-3xl mx-auto print:max-w-none">
        {visibleSections.length > 0 ? (
          visibleSections.map((section) => (
            <div key={section.id} className="print:break-inside-avoid">
              <RenderSection section={section} branding={branding} />
            </div>
          ))
        ) : (
          <div className="py-16 text-center text-gray-400">
            <p className="text-lg">No visible sections</p>
            <p className="text-sm mt-1">Toggle sections on to see them in the preview</p>
          </div>
        )}
      </div>
    </div>
  )
}
