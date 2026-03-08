// Plating Guide Display Card
// Visual presentation instructions for a single dish
// Designed for screen viewing and print (kitchen station posting)

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { PlatingGuide, PlatingComponent } from '@/lib/recipes/plating-actions'

interface PlatingGuideCardProps {
  guide: PlatingGuide
  onEdit?: () => void
  onDelete?: () => void
  showActions?: boolean
}

export function PlatingGuideCard({ guide, onEdit, onDelete, showActions = true }: PlatingGuideCardProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const components = guide.components || []

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${guide.dish_name} - Plating Guide</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 24px;
            color: #1c1917;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
          .vessel { font-size: 16px; color: #57534e; margin-bottom: 20px; }
          .section { margin-bottom: 16px; }
          .section-title {
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #78716c;
            margin-bottom: 6px;
            border-bottom: 1px solid #e7e5e4;
            padding-bottom: 4px;
          }
          .section-content { font-size: 15px; line-height: 1.5; }
          .component {
            margin-bottom: 10px;
            padding: 8px 12px;
            background: #fafaf9;
            border-left: 3px solid #d6d3d1;
          }
          .component-name { font-weight: 600; font-size: 15px; }
          .component-detail { font-size: 14px; color: #44403c; margin-top: 2px; }
          .photo { max-width: 100%; border-radius: 8px; margin-bottom: 20px; }
          .footer {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #e7e5e4;
            font-size: 12px;
            color: #a8a29e;
          }
          @media print {
            body { padding: 12px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(guide.dish_name)}</h1>
        ${guide.vessel ? `<p class="vessel">Vessel: ${escapeHtml(guide.vessel)}</p>` : ''}
        ${guide.reference_photo_url ? `<img src="${escapeHtml(guide.reference_photo_url)}" alt="Reference" class="photo" />` : ''}
        ${components.length > 0 ? `
          <div class="section">
            <div class="section-title">Components</div>
            ${components.map(c => `
              <div class="component">
                <div class="component-name">${escapeHtml(c.name)}</div>
                <div class="component-detail">Placement: ${escapeHtml(c.placement)}</div>
                ${c.technique ? `<div class="component-detail">Technique: ${escapeHtml(c.technique)}</div>` : ''}
                ${c.notes ? `<div class="component-detail">Notes: ${escapeHtml(c.notes)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${guide.garnish ? `
          <div class="section">
            <div class="section-title">Garnish</div>
            <div class="section-content">${escapeHtml(guide.garnish)}</div>
          </div>
        ` : ''}
        ${guide.sauce_technique ? `
          <div class="section">
            <div class="section-title">Sauce Technique</div>
            <div class="section-content">${escapeHtml(guide.sauce_technique)}</div>
          </div>
        ` : ''}
        ${guide.temperature_notes ? `
          <div class="section">
            <div class="section-title">Temperature Notes</div>
            <div class="section-content">${escapeHtml(guide.temperature_notes)}</div>
          </div>
        ` : ''}
        ${guide.special_instructions ? `
          <div class="section">
            <div class="section-title">Special Instructions</div>
            <div class="section-content">${escapeHtml(guide.special_instructions)}</div>
          </div>
        ` : ''}
        <div class="footer">Plating Guide - ChefFlow</div>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const components = guide.components || []

  return (
    <Card className="print:shadow-none print:border-stone-300">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="text-xl">{guide.dish_name}</CardTitle>
          {guide.vessel && (
            <p className="text-sm text-stone-500 mt-1">Vessel: {guide.vessel}</p>
          )}
        </div>
        {showActions && (
          <div className="flex gap-1.5 shrink-0 print:hidden">
            <Button variant="ghost" onClick={handlePrint} className="text-xs px-2 py-1 h-auto">
              Print
            </Button>
            {onEdit && (
              <Button variant="ghost" onClick={onEdit} className="text-xs px-2 py-1 h-auto">
                Edit
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" onClick={onDelete} className="text-xs px-2 py-1 h-auto text-red-600 hover:text-red-700">
                Delete
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Reference photo */}
        {guide.reference_photo_url && (
          <div>
            <img
              src={guide.reference_photo_url}
              alt={`${guide.dish_name} plating reference`}
              className="w-full max-h-64 object-cover rounded-lg border border-stone-200"
            />
          </div>
        )}

        {/* Components */}
        {components.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">
              Components
            </h4>
            <div className="space-y-2">
              {components.map((comp: PlatingComponent, i: number) => (
                <div key={i} className="bg-stone-50 rounded-lg p-3 border-l-3 border-stone-300">
                  <p className="font-semibold text-stone-900">{comp.name}</p>
                  <p className="text-sm text-stone-600 mt-0.5">
                    <span className="font-medium">Placement:</span> {comp.placement}
                  </p>
                  {comp.technique && (
                    <p className="text-sm text-stone-600">
                      <span className="font-medium">Technique:</span> {comp.technique}
                    </p>
                  )}
                  {comp.notes && (
                    <p className="text-sm text-stone-500 italic mt-0.5">{comp.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Garnish */}
        {guide.garnish && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
              Garnish
            </h4>
            <p className="text-sm text-stone-700">{guide.garnish}</p>
          </div>
        )}

        {/* Sauce technique */}
        {guide.sauce_technique && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
              Sauce Technique
            </h4>
            <p className="text-sm text-stone-700">{guide.sauce_technique}</p>
          </div>
        )}

        {/* Temperature notes */}
        {guide.temperature_notes && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
              Temperature Notes
            </h4>
            <p className="text-sm text-stone-700">{guide.temperature_notes}</p>
          </div>
        )}

        {/* Special instructions */}
        {guide.special_instructions && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1">
              Special Instructions
            </h4>
            <p className="text-sm text-stone-700">{guide.special_instructions}</p>
          </div>
        )}

        {/* Empty state */}
        {!guide.vessel && components.length === 0 && !guide.garnish && !guide.sauce_technique && !guide.temperature_notes && !guide.special_instructions && (
          <p className="text-sm text-stone-400 italic">No plating details added yet.</p>
        )}
      </CardContent>
    </Card>
  )
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
