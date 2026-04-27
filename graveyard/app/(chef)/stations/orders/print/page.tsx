// Print-Friendly Unified Order Sheet
// Aggregates all "need to order" items from ALL stations into one printable sheet.
// Clean layout for calling vendors or emailing orders.
// Uses the shared print system from globals.css.
// Supports ?mode=thermal query param for 80mm thermal printers.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PrintableDocument } from '@/components/print/printable-document'
import { getDocumentContext } from '@/lib/print/actions'

export const metadata: Metadata = { title: 'Print Order Sheet' }

export default async function PrintOrderSheetPage({
  searchParams,
}: {
  searchParams: { mode?: string }
}) {
  const user = await requireChef()
  const db: any = createServerClient()
  // Resolve all print context - attribution, default mode, custom footer
  const { generatedBy, printMode: defaultMode, customFooter } = await getDocumentContext()
  const printMode =
    searchParams.mode === 'thermal' ? ('thermal-80' as const) : (defaultMode ?? 'standard')
  const printedAt = new Date().toLocaleString()

  const _opp = new Date()
  const today = `${_opp.getFullYear()}-${String(_opp.getMonth() + 1).padStart(2, '0')}-${String(_opp.getDate()).padStart(2, '0')}`

  // Load all pending order requests
  const { data: orders } = await db
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
    .order('requested_at', { ascending: false })

  // Also load clipboard entries with need_to_order > 0 from today
  const { data: clipboardNeeds } = await db
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

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <PrintableDocument
      title="Order Sheet"
      subtitle={`Generated: ${dateLabel}`}
      footer={
        customFooter ??
        `ChefFlow Order Sheet - Printed ${printedAt}\nBlank "Ordered" column for manual checkoff when calling vendors.`
      }
      generatedBy={generatedBy}
      printedAt={printedAt}
      mode={printMode}
    >
      {/* Pending Order Requests */}
      {orderItems.length > 0 && (
        <>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
            Pending Order Requests
          </h2>
          <table className="print-table">
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
                  <td>{(order.stations as any)?.name ?? '-'}</td>
                  <td>{(order.station_components as any)?.name ?? '-'}</td>
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
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '8px',
              marginTop: '16px',
            }}
          >
            Today&apos;s Clipboard Needs
          </h2>
          <table className="print-table">
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
                  <td>{(item.stations as any)?.name ?? '-'}</td>
                  <td>{(item.station_components as any)?.name ?? '-'}</td>
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
    </PrintableDocument>
  )
}
