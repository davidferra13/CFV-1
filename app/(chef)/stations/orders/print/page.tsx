// Print-Friendly Unified Order Sheet
// Aggregates all "need to order" items from ALL stations into one printable sheet.
// Clean layout for calling vendors or emailing orders.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Print Order Sheet — ChefFlow' }

export default async function PrintOrderSheetPage() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  // Load all pending order requests
  const { data: orders } = await supabase
    .from('order_requests')
    .select(
      `
      *,
      stations (name),
      station_components (name, unit)
    `
    )
    .eq('chef_id', user.tenantId!)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Also load clipboard entries with need_to_order > 0 from today
  const { data: clipboardNeeds } = await supabase
    .from('clipboard_entries')
    .select(
      `
      need_to_order,
      notes,
      stations (name),
      station_components (name, unit)
    `
    )
    .eq('chef_id', user.tenantId!)
    .eq('entry_date', today)
    .gt('need_to_order', 0)

  const orderItems = orders ?? []
  const clipboardItems = clipboardNeeds ?? []

  return (
    <div className="print-orders p-4 max-w-[8.5in]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body { background: white !important; color: black !important; }
          nav, header, footer, .no-print { display: none !important; }
          .print-orders { padding: 0.25in; font-size: 12px; }
          .print-orders table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
          .print-orders th, .print-orders td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
          .print-orders th { background: #eee; font-weight: bold; }
          .print-orders h1 { font-size: 20px; margin-bottom: 4px; }
          .print-orders h2 { font-size: 16px; margin-top: 16px; margin-bottom: 8px; }
          .print-orders .meta { font-size: 11px; color: #666; }
        }
        @media screen {
          .print-orders { background: white; color: black; border-radius: 8px; }
          .print-orders table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
          .print-orders th, .print-orders td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; font-size: 13px; }
          .print-orders th { background: #f5f5f5; font-weight: 600; }
        }
      `,
        }}
      />

      <h1 style={{ fontSize: '22px', fontWeight: 'bold' }}>Order Sheet</h1>
      <div className="meta" style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
        Generated:{' '}
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>

      <button
        className="no-print mb-4 px-4 py-2 bg-stone-800 text-stone-100 rounded text-sm"
        style={{ cursor: 'pointer' }}
      >
        Print (Ctrl+P)
      </button>

      {/* Pending Order Requests */}
      {orderItems.length > 0 && (
        <>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
            Pending Order Requests
          </h2>
          <table>
            <thead>
              <tr>
                <th>Station</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Notes</th>
                <th style={{ width: '80px' }}>Ordered</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((order: any) => (
                <tr key={order.id}>
                  <td>{(order.stations as any)?.name ?? '—'}</td>
                  <td>{(order.station_components as any)?.name ?? '—'}</td>
                  <td style={{ fontWeight: 'bold' }}>{order.quantity}</td>
                  <td>{order.unit ?? (order.station_components as any)?.unit ?? ''}</td>
                  <td>{order.notes ?? ''}</td>
                  <td style={{ borderBottom: '1px solid #000' }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Clipboard "Need to Order" */}
      {clipboardItems.length > 0 && (
        <>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
            Today&apos;s Clipboard Needs
          </h2>
          <table>
            <thead>
              <tr>
                <th>Station</th>
                <th>Item</th>
                <th>Need to Order</th>
                <th>Unit</th>
                <th>Notes</th>
                <th style={{ width: '80px' }}>Ordered</th>
              </tr>
            </thead>
            <tbody>
              {clipboardItems.map((item: any, i: number) => (
                <tr key={i}>
                  <td>{(item.stations as any)?.name ?? '—'}</td>
                  <td>{(item.station_components as any)?.name ?? '—'}</td>
                  <td style={{ fontWeight: 'bold' }}>{item.need_to_order}</td>
                  <td>{(item.station_components as any)?.unit ?? ''}</td>
                  <td>{item.notes ?? ''}</td>
                  <td style={{ borderBottom: '1px solid #000' }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {orderItems.length === 0 && clipboardItems.length === 0 && (
        <p style={{ color: '#888', marginTop: '16px' }}>
          No pending orders. All stations are stocked.
        </p>
      )}

      <div className="meta" style={{ marginTop: '16px', fontSize: '10px', color: '#999' }}>
        ChefFlow Order Sheet — Printed {new Date().toLocaleString()}
        <br />
        Blank &quot;Ordered&quot; column for manual checkoff when calling vendors.
      </div>
    </div>
  )
}
