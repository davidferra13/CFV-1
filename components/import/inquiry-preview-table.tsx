// Inquiry Import Preview Table
// Editable row grid for reviewing parsed inquiries before import.
// Each row allows per-row status, channel, date, and decline reason overrides.

'use client'

import { Badge } from '@/components/ui/badge'
import {
  IMPORT_STATUS_OPTIONS,
  IMPORT_CHANNEL_OPTIONS,
  IMPORT_DECLINE_REASONS,
} from '@/lib/inquiries/import-constants'
import { getCommunicationPreviewText } from '@/components/communication/message-content'
import type { ParsedInquiryRow } from '@/lib/ai/parse-csv-inquiries'

type Props = {
  rows: ParsedInquiryRow[]
  skippedRows: Set<string>
  duplicateRows: Set<string>
  onToggleSkip: (id: string) => void
  onUpdateRow: (id: string, updates: Partial<ParsedInquiryRow>) => void
}

export function InquiryPreviewTable({
  rows,
  skippedRows,
  duplicateRows,
  onToggleSkip,
  onUpdateRow,
}: Props) {
  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
      {rows.map((row) => {
        const skipped = skippedRows.has(row.id)
        const isDupe = duplicateRows.has(row.id)

        return (
          <div
            key={row.id}
            className={`p-3 rounded-lg border text-sm transition-opacity ${
              skipped
                ? 'border-stone-700 bg-stone-800 opacity-40'
                : isDupe
                  ? 'border-yellow-800 bg-yellow-950/50'
                  : 'border-stone-700 bg-stone-900'
            }`}
          >
            {/* Row header: name + badges + skip button */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <span className="font-medium text-stone-100">{row.client_name}</span>
                {row.client_email && (
                  <span className="text-stone-500 text-xs">{row.client_email}</span>
                )}
                {row.client_phone && (
                  <span className="text-stone-500 text-xs">{row.client_phone}</span>
                )}
                {row.first_contact_at && (
                  <span className="text-stone-500 text-xs">{row.first_contact_at}</span>
                )}
                {isDupe && (
                  <Badge variant="warning" className="text-xs">
                    possible duplicate
                  </Badge>
                )}
              </div>
              <button
                onClick={() => onToggleSkip(row.id)}
                className="text-xs text-stone-500 hover:text-stone-300 shrink-0"
              >
                {skipped ? 'Restore' : 'Skip'}
              </button>
            </div>

            {/* Editable fields row */}
            {!skipped && (
              <div className="flex flex-wrap gap-2 items-center">
                {/* Status */}
                <select
                  value={row.status || 'new'}
                  onChange={(e) => onUpdateRow(row.id, { status: e.target.value })}
                  className="px-2 py-1 text-xs rounded border border-stone-600 bg-stone-800 text-stone-200"
                >
                  {IMPORT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Channel */}
                <select
                  value={row.channel || 'other'}
                  onChange={(e) => onUpdateRow(row.id, { channel: e.target.value })}
                  className="px-2 py-1 text-xs rounded border border-stone-600 bg-stone-800 text-stone-200"
                >
                  {IMPORT_CHANNEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Date */}
                <input
                  type="date"
                  value={row.first_contact_at || ''}
                  onChange={(e) => onUpdateRow(row.id, { first_contact_at: e.target.value })}
                  className="px-2 py-1 text-xs rounded border border-stone-600 bg-stone-800 text-stone-200"
                />

                {/* Occasion */}
                {row.confirmed_occasion && (
                  <span className="text-xs text-stone-400">{row.confirmed_occasion}</span>
                )}

                {/* Guests */}
                {row.confirmed_guest_count && (
                  <span className="text-xs text-stone-400">{row.confirmed_guest_count} guests</span>
                )}

                {/* Budget */}
                {row.confirmed_budget_cents && (
                  <span className="text-xs text-stone-400">
                    ${(row.confirmed_budget_cents / 100).toFixed(0)}
                  </span>
                )}

                {/* Decline reason (only when status is declined) */}
                {row.status === 'declined' && (
                  <select
                    value={row.decline_reason || ''}
                    onChange={(e) => onUpdateRow(row.id, { decline_reason: e.target.value })}
                    className="px-2 py-1 text-xs rounded border border-stone-600 bg-stone-800 text-stone-200"
                  >
                    <option value="">Decline reason...</option>
                    {IMPORT_DECLINE_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Source message preview */}
            {!skipped && row.source_message && (
              <p className="mt-1.5 text-xs text-stone-500 line-clamp-2 italic">
                {getCommunicationPreviewText(row.source_message, 220)}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
