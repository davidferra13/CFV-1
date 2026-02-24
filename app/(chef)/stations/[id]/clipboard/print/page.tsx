// Print-Friendly Station Clipboard
// Clean layout optimized for paper — no nav chrome, large cells, clear labels.
// Uses @media print CSS for proper paper output.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Print Clipboard — ChefFlow' }

export default async function PrintClipboardPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { date?: string }
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  const date = searchParams.date ?? new Date().toISOString().split('T')[0]

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

  return (
    <div className="print-clipboard p-4 max-w-[11in]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body { background: white !important; color: black !important; }
          nav, header, footer, .no-print { display: none !important; }
          .print-clipboard { padding: 0.25in; font-size: 11px; }
          .print-clipboard table { border-collapse: collapse; width: 100%; }
          .print-clipboard th, .print-clipboard td { border: 1px solid #333; padding: 4px 6px; text-align: left; }
          .print-clipboard th { background: #eee; font-weight: bold; }
          .print-clipboard .expired { background: #fdd; }
          .print-clipboard .expiring { background: #ffd; }
          .print-clipboard h1 { font-size: 18px; margin-bottom: 4px; }
          .print-clipboard .meta { font-size: 12px; color: #666; margin-bottom: 12px; }
        }
        @media screen {
          .print-clipboard { background: white; color: black; border-radius: 8px; }
          .print-clipboard table { border-collapse: collapse; width: 100%; }
          .print-clipboard th, .print-clipboard td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 13px; }
          .print-clipboard th { background: #f5f5f5; font-weight: 600; }
          .print-clipboard .expired { background: #fee; }
          .print-clipboard .expiring { background: #ffd; }
        }
      `,
        }}
      />

      <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>{station.name} — Daily Clipboard</h1>
      <div className="meta" style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
        Date:{' '}
        {new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>

      <button
        onClick={() => {}}
        className="no-print mb-4 px-4 py-2 bg-stone-800 text-stone-100 rounded text-sm"
        style={{ cursor: 'pointer' }}
      >
        Print (Ctrl+P)
      </button>

      {allComponents.length === 0 ? (
        <p style={{ color: '#888' }}>No components configured for this station.</p>
      ) : (
        <table>
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
                <tr key={comp.id} className={isExpired ? 'expired' : isExpiring ? 'expiring' : ''}>
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

      <div className="meta" style={{ marginTop: '12px', fontSize: '11px', color: '#999' }}>
        ChefFlow Station Clipboard — Printed {new Date().toLocaleString()}
      </div>
    </div>
  )
}
