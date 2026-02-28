// Print-Friendly Station Clipboard
// Clean layout optimized for paper — no nav chrome, large cells, clear labels.
// Uses the shared print system from globals.css (print-standard, print-table, etc.)
// Also works on 80mm thermal printers — the table auto-compresses.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PrintableDocument } from '@/components/print/printable-document'
import { getDocumentContext } from '@/lib/print/actions'

export const metadata: Metadata = { title: 'Print Clipboard — ChefFlow' }

export default async function PrintClipboardPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { date?: string; mode?: string }
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const date = searchParams.date ?? new Date().toISOString().split('T')[0]

  // Resolve all print context — attribution, default mode, custom footer
  const { generatedBy, printMode: defaultMode, customFooter } = await getDocumentContext()
  const printMode =
    searchParams.mode === 'thermal' ? ('thermal-80' as const) : (defaultMode ?? 'standard')

  // Load station
  const { data: station } = await supabase
    .from('stations')
    .select('id, name')
    .eq('id', params.id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!station) {
    return <p className="p-8 text-lg">Station not found.</p>
  }

  // Load components for this station
  const { data: menuItems } = await supabase
    .from('station_menu_items')
    .select('id, name, station_components(id, name, unit, par_level, par_unit, shelf_life_days)')
    .eq('station_id', params.id)
    .eq('chef_id', user.tenantId!)

  // Load clipboard entries for this date
  const { data: entries } = await supabase
    .from('clipboard_entries')
    .select('*')
    .eq('station_id', params.id)
    .eq('chef_id', user.tenantId!)
    .eq('entry_date', date)

  const entryMap = new Map((entries ?? []).map((e: any) => [e.component_id, e]))

  // Flatten all components across menu items
  const allComponents = (menuItems ?? []).flatMap((mi: any) =>
    (mi.station_components ?? []).map((c: any) => ({
      ...c,
      menuItem: mi.name,
      entry: entryMap.get(c.id),
    }))
  )

  const dateLabel = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <PrintableDocument
      title={`${station.name} — Daily Clipboard`}
      subtitle={`Date: ${dateLabel}`}
      generatedBy={generatedBy}
      footer={customFooter ?? undefined}
      mode={printMode}
    >
      {allComponents.length === 0 ? (
        <p style={{ color: '#888' }}>No components configured for this station.</p>
      ) : (
        <table className="print-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Component</th>
              <th>Par</th>
              <th>On Hand</th>
              <th>Need</th>
              <th>Made</th>
              <th>Order</th>
              <th>Waste</th>
              <th>Shelf Life</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {allComponents.map((comp: any) => {
              const e = comp.entry
              const onHand = e?.on_hand ?? 0
              const need = Math.max(0, (comp.par_level ?? 0) - onHand)
              const shelfDays = comp.shelf_life_days
              const madeAt = e?.made_at ? new Date(e.made_at) : null
              const expiresOn =
                madeAt && shelfDays ? new Date(madeAt.getTime() + shelfDays * 86400000) : null
              const today = new Date()
              const isExpired = expiresOn && expiresOn <= today
              const isExpiring =
                expiresOn && !isExpired && expiresOn <= new Date(today.getTime() + 86400000)

              return (
                <tr
                  key={comp.id}
                  className={isExpired ? 'print-row-danger' : isExpiring ? 'print-row-warn' : ''}
                >
                  <td>{comp.menuItem}</td>
                  <td>{comp.name}</td>
                  <td>
                    {comp.par_level ?? '—'} {comp.par_unit ?? comp.unit ?? ''}
                  </td>
                  <td>{e?.on_hand ?? ''}</td>
                  <td style={{ fontWeight: need > 0 ? 'bold' : 'normal' }}>
                    {need > 0 ? need : '—'}
                  </td>
                  <td>{e?.made ?? ''}</td>
                  <td>{e?.need_to_order ?? ''}</td>
                  <td>{e?.waste_qty ?? ''}</td>
                  <td>
                    {shelfDays ? `${shelfDays}d` : '—'}
                    {isExpired && ' EXPIRED'}
                    {isExpiring && ' EXP TODAY'}
                  </td>
                  <td>{e?.notes ?? ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </PrintableDocument>
  )
}
