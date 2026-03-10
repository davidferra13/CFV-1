// BEO HTML Formatter
// Renders a BEOData object as a standalone, printable HTML document.
// Not a server action (pure function), so it can be imported anywhere.

import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils/currency'
import type { BEOData } from './types'

export function formatBEOAsHTML(beo: BEOData): string {
  const escape = (s: string | null | undefined) =>
    (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const formatTime = (t: string | null) => {
    if (!t) return 'TBD'
    try {
      const parts = t.split(':')
      const h = parseInt(parts[0], 10)
      const m = parts[1] || '00'
      const ampm = h >= 12 ? 'PM' : 'AM'
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      return `${h12}:${m} ${ampm}`
    } catch {
      return t
    }
  }

  const paymentStatusLabel = (s: string) => {
    const map: Record<string, string> = {
      unpaid: 'Unpaid',
      deposit_paid: 'Deposit Paid',
      partial: 'Partial',
      paid: 'Paid in Full',
      refunded: 'Refunded',
      overpaid: 'Overpaid',
    }
    return map[s] || s
  }

  const serviceStyleLabel = (s: string) => {
    const map: Record<string, string> = {
      plated: 'Plated',
      family_style: 'Family Style',
      buffet: 'Buffet',
      passed: 'Passed/Canape',
      tasting: 'Tasting Menu',
      stations: 'Stations',
      cooking_class: 'Cooking Class',
      meal_prep: 'Meal Prep',
      drop_off: 'Drop Off',
    }
    return map[s] || s
  }

  // Build menu section
  let menuHTML = ''
  if (beo.isSimpleMenu && beo.simpleMenuContent) {
    menuHTML = `
      <div class="beo-section">
        <h2>Menu${beo.menuName ? ` - ${escape(beo.menuName)}` : ''}</h2>
        ${beo.menuDescription ? `<p class="menu-desc">${escape(beo.menuDescription)}</p>` : ''}
        <div class="simple-menu">${escape(beo.simpleMenuContent).replace(/\n/g, '<br>')}</div>
      </div>
    `
  } else if (beo.courses.length > 0) {
    const coursesHTML = beo.courses
      .map((course) => {
        const dishRows = course.dishes
          .map((dish) => {
            const tags = [
              ...dish.dietaryTags.map((t) => `<span class="tag dietary">${escape(t)}</span>`),
              ...dish.allergenFlags.map((t) => `<span class="tag allergen">${escape(t)}</span>`),
            ].join(' ')

            return `
              <tr>
                <td class="dish-name">
                  ${escape(dish.name)}
                  ${tags ? `<div class="tags">${tags}</div>` : ''}
                </td>
                <td class="dish-desc">${escape(dish.description)}</td>
                ${beo.version === 'kitchen' && dish.platingInstructions ? `<td class="dish-plating">${escape(dish.platingInstructions)}</td>` : ''}
              </tr>
            `
          })
          .join('')

        return `
          <div class="course">
            <h3>${escape(course.name)}</h3>
            <table class="dish-table">
              <thead>
                <tr>
                  <th>Dish</th>
                  <th>Description</th>
                  ${beo.version === 'kitchen' ? '<th>Plating</th>' : ''}
                </tr>
              </thead>
              <tbody>${dishRows}</tbody>
            </table>
          </div>
        `
      })
      .join('')

    menuHTML = `
      <div class="beo-section">
        <h2>Menu${beo.menuName ? ` - ${escape(beo.menuName)}` : ''}</h2>
        ${beo.menuDescription ? `<p class="menu-desc">${escape(beo.menuDescription)}</p>` : ''}
        ${coursesHTML}
      </div>
    `
  } else if (beo.menuName) {
    menuHTML = `
      <div class="beo-section">
        <h2>Menu - ${escape(beo.menuName)}</h2>
        ${beo.menuDescription ? `<p class="menu-desc">${escape(beo.menuDescription)}</p>` : ''}
        <p class="no-data">No dishes added to menu yet.</p>
      </div>
    `
  } else {
    menuHTML = `
      <div class="beo-section">
        <h2>Menu</h2>
        <p class="no-data">No menu attached to this event.</p>
      </div>
    `
  }

  // Dietary section
  const hasDietary = beo.dietaryRestrictions.length > 0 || beo.allergies.length > 0
  const dietaryHTML = hasDietary
    ? `
      <div class="beo-section">
        <h2>Dietary Notes &amp; Allergies</h2>
        ${
          beo.dietaryRestrictions.length > 0
            ? `<div class="diet-row"><strong>Dietary Restrictions:</strong> ${beo.dietaryRestrictions.map((d) => escape(d)).join(', ')}</div>`
            : ''
        }
        ${
          beo.allergies.length > 0
            ? `<div class="diet-row allergy"><strong>Allergies:</strong> ${beo.allergies.map((a) => escape(a)).join(', ')}</div>`
            : ''
        }
      </div>
    `
    : ''

  // Timeline section
  const timelineHTML = `
    <div class="beo-section">
      <h2>Timeline</h2>
      <table class="info-table">
        <tbody>
          <tr><td class="label">Arrival / Setup</td><td>${formatTime(beo.timeline.arrivalTime)}</td></tr>
          <tr><td class="label">Service Time</td><td>${formatTime(beo.timeline.serveTime)}</td></tr>
          <tr><td class="label">Departure</td><td>${formatTime(beo.timeline.departureTime)}</td></tr>
        </tbody>
      </table>
    </div>
  `

  // Staff section
  const staffHTML =
    beo.staff.length > 0
      ? `
      <div class="beo-section">
        <h2>Staff</h2>
        <table class="info-table">
          <thead><tr><th>Name</th><th>Role</th><th>Phone</th></tr></thead>
          <tbody>
            ${beo.staff.map((s) => `<tr><td>${escape(s.name)}</td><td>${escape(s.role)}</td><td>${escape(s.phone)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `
      : ''

  // Notes section
  const hasNotes =
    beo.specialRequests || beo.kitchenNotes || beo.siteNotes || beo.accessInstructions
  const notesHTML = hasNotes
    ? `
      <div class="beo-section">
        <h2>Notes &amp; Instructions</h2>
        ${beo.specialRequests ? `<div class="note-row"><strong>Special Requests:</strong> ${escape(beo.specialRequests)}</div>` : ''}
        ${beo.kitchenNotes ? `<div class="note-row"><strong>Kitchen Notes:</strong> ${escape(beo.kitchenNotes)}</div>` : ''}
        ${beo.siteNotes ? `<div class="note-row"><strong>Site Notes:</strong> ${escape(beo.siteNotes)}</div>` : ''}
        ${beo.accessInstructions ? `<div class="note-row"><strong>Access Instructions:</strong> ${escape(beo.accessInstructions)}</div>` : ''}
      </div>
    `
    : ''

  // Other details
  const otherHTML =
    beo.alcoholBeingServed !== null || beo.cannabisPreference !== null
      ? `
      <div class="beo-section">
        <h2>Additional Details</h2>
        <table class="info-table">
          <tbody>
            ${beo.alcoholBeingServed !== null ? `<tr><td class="label">Alcohol</td><td>${beo.alcoholBeingServed ? 'Yes' : 'No'}</td></tr>` : ''}
            ${beo.cannabisPreference !== null ? `<tr><td class="label">Cannabis</td><td>${beo.cannabisPreference ? 'Yes' : 'No'}</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `
      : ''

  // Financials section (full version only)
  const financialsHTML = beo.financials
    ? `
      <div class="beo-section financials">
        <h2>Financial Summary</h2>
        <table class="info-table">
          <tbody>
            ${beo.financials.quotedPriceCents !== null ? `<tr><td class="label">Quoted Price</td><td class="money">${formatCurrency(beo.financials.quotedPriceCents)}</td></tr>` : ''}
            ${beo.financials.depositAmountCents !== null ? `<tr><td class="label">Deposit Required</td><td class="money">${formatCurrency(beo.financials.depositAmountCents)}</td></tr>` : ''}
            <tr><td class="label">Total Paid</td><td class="money">${formatCurrency(beo.financials.totalPaidCents)}</td></tr>
            ${beo.financials.totalRefundedCents > 0 ? `<tr><td class="label">Refunded</td><td class="money">(${formatCurrency(beo.financials.totalRefundedCents)})</td></tr>` : ''}
            <tr class="balance-row"><td class="label">Balance Due</td><td class="money">${formatCurrency(beo.financials.outstandingBalanceCents)}</td></tr>
            <tr><td class="label">Payment Status</td><td>${paymentStatusLabel(beo.financials.paymentStatus)}</td></tr>
          </tbody>
        </table>
      </div>
    `
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>BEO - ${escape(beo.eventName)} - ${escape(beo.formattedDate)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.5; padding: 40px; max-width: 850px; margin: 0 auto; }
    .beo-header { border-bottom: 3px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px; }
    .beo-header h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .beo-header .subtitle { font-size: 14px; color: #666; }
    .beo-header .chef-name { font-size: 16px; font-weight: 600; margin-bottom: 2px; }
    .beo-version-badge { display: inline-block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 3px; background: ${beo.version === 'kitchen' ? '#fef3cd' : '#d1ecf1'}; color: ${beo.version === 'kitchen' ? '#856404' : '#0c5460'}; margin-left: 8px; }
    .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; }
    .beo-section { margin-bottom: 24px; page-break-inside: avoid; }
    .beo-section h2 { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 12px; }
    .beo-section h3 { font-size: 14px; font-weight: 600; margin: 12px 0 6px; color: #333; }
    .info-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .info-table th, .info-table td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #eee; }
    .info-table th { font-weight: 600; font-size: 12px; text-transform: uppercase; color: #666; }
    .info-table .label { font-weight: 600; width: 40%; color: #444; }
    .info-table .money { font-family: 'Courier New', monospace; }
    .dish-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 4px; }
    .dish-table th, .dish-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
    .dish-table th { font-weight: 600; font-size: 11px; text-transform: uppercase; color: #666; background: #f8f8f8; }
    .dish-name { font-weight: 600; }
    .tags { margin-top: 4px; }
    .tag { display: inline-block; font-size: 10px; padding: 1px 6px; border-radius: 3px; margin-right: 4px; }
    .tag.dietary { background: #e8f5e9; color: #2e7d32; }
    .tag.allergen { background: #ffebee; color: #c62828; font-weight: 700; }
    .menu-desc { font-style: italic; color: #666; margin-bottom: 12px; font-size: 14px; }
    .simple-menu { font-size: 14px; padding: 12px; background: #fafafa; border: 1px solid #eee; border-radius: 4px; white-space: pre-wrap; }
    .diet-row { font-size: 14px; margin-bottom: 6px; }
    .diet-row.allergy { color: #c62828; }
    .note-row { font-size: 14px; margin-bottom: 8px; }
    .no-data { color: #999; font-style: italic; font-size: 14px; }
    .balance-row td { font-weight: 700; border-top: 2px solid #333; }
    .beo-footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 11px; color: #999; text-align: center; }
    .guest-count-unconfirmed { color: #e65100; font-style: italic; }
    @media print {
      body { padding: 20px; }
      .beo-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="beo-header">
    <div class="chef-name">${escape(beo.chef.businessName)}</div>
    <h1>Banquet Event Order <span class="beo-version-badge">${beo.version === 'kitchen' ? 'Kitchen' : 'Full'}</span></h1>
    <div class="subtitle">Generated ${format(new Date(beo.generatedAt), 'MMM d, yyyy h:mm a')}</div>
  </div>

  <div class="header-grid">
    <div class="beo-section">
      <h2>Event Details</h2>
      <table class="info-table">
        <tbody>
          <tr><td class="label">Event</td><td>${escape(beo.eventName)}</td></tr>
          <tr><td class="label">Date</td><td>${escape(beo.formattedDate)}</td></tr>
          <tr><td class="label">Service Time</td><td>${formatTime(beo.serveTime)}</td></tr>
          <tr><td class="label">Service Style</td><td>${serviceStyleLabel(beo.serviceStyle)}</td></tr>
          <tr><td class="label">Guest Count</td><td>${beo.guestCount}${!beo.guestCountConfirmed ? ' <span class="guest-count-unconfirmed">(unconfirmed)</span>' : ''}</td></tr>
          <tr><td class="label">Status</td><td>${beo.status.charAt(0).toUpperCase() + beo.status.slice(1).replace('_', ' ')}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="beo-section">
      <h2>Client &amp; Location</h2>
      <table class="info-table">
        <tbody>
          <tr><td class="label">Client</td><td>${escape(beo.client.name)}</td></tr>
          ${beo.version === 'full' ? `<tr><td class="label">Email</td><td>${escape(beo.client.email)}</td></tr>` : ''}
          ${beo.client.phone ? `<tr><td class="label">Phone</td><td>${escape(beo.client.phone)}</td></tr>` : ''}
          <tr><td class="label">Address</td><td>${escape(beo.locationAddress)}</td></tr>
          <tr><td class="label">City/State</td><td>${escape(beo.locationCity)}, ${escape(beo.locationState)} ${escape(beo.locationZip)}</td></tr>
          ${beo.locationNotes ? `<tr><td class="label">Location Notes</td><td>${escape(beo.locationNotes)}</td></tr>` : ''}
        </tbody>
      </table>
    </div>
  </div>

  ${dietaryHTML}
  ${menuHTML}
  ${timelineHTML}
  ${staffHTML}
  ${notesHTML}
  ${otherHTML}
  ${financialsHTML}
  ${buildEquipmentChecklistHTML(beo, escape)}
  ${buildVendorDeliveriesHTML(beo, escape, formatTime)}
  ${buildStationAssignmentsHTML(beo, escape)}
  ${buildBreakdownTimelineHTML(beo, escape)}

  <div class="beo-footer">
    ${escape(beo.chef.businessName)} | ${escape(beo.chef.email)}${beo.chef.phone ? ` | ${escape(beo.chef.phone)}` : ''}
  </div>
</body>
</html>`
}

// ─── Enhanced BEO Section Builders ───────────────────────────────────────────

function buildEquipmentChecklistHTML(
  beo: BEOData,
  escape: (s: string | null | undefined) => string
): string {
  if (!beo.equipmentChecklist || beo.equipmentChecklist.length === 0) return ''

  const rows = beo.equipmentChecklist
    .map(
      (item) => `
      <tr>
        <td>${escape(item.name)}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td>${escape(item.source)}</td>
        <td>${escape(item.category)}</td>
      </tr>`
    )
    .join('')

  return `
    <div class="beo-section">
      <h2>Equipment Checklist</h2>
      <table class="info-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align:center">Qty</th>
            <th>Source</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}

function buildVendorDeliveriesHTML(
  beo: BEOData,
  escape: (s: string | null | undefined) => string,
  formatTime: (t: string | null) => string
): string {
  if (!beo.vendorDeliveries || beo.vendorDeliveries.length === 0) return ''

  const rows = beo.vendorDeliveries
    .map(
      (v) => `
      <tr>
        <td>${formatTime(v.deliveryTime)}</td>
        <td>${escape(v.vendorName)}</td>
        <td>${escape(v.deliveryType)}</td>
        <td>${escape(v.items)}</td>
        <td>${escape(v.contactInfo)}</td>
      </tr>`
    )
    .join('')

  return `
    <div class="beo-section">
      <h2>Vendor Deliveries</h2>
      <table class="info-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Vendor</th>
            <th>Type</th>
            <th>Items</th>
            <th>Contact</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}

function buildStationAssignmentsHTML(
  beo: BEOData,
  escape: (s: string | null | undefined) => string
): string {
  if (!beo.stationAssignments || beo.stationAssignments.length === 0) return ''

  const rows = beo.stationAssignments
    .map(
      (s) => `
      <tr>
        <td>${escape(s.stationName)}</td>
        <td>${escape(s.staffName)}</td>
        <td>${escape(s.roleNotes)}</td>
      </tr>`
    )
    .join('')

  return `
    <div class="beo-section">
      <h2>Station Assignments</h2>
      <table class="info-table">
        <thead>
          <tr>
            <th>Station</th>
            <th>Staff</th>
            <th>Role Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}

function buildBreakdownTimelineHTML(
  beo: BEOData,
  escape: (s: string | null | undefined) => string
): string {
  if (!beo.breakdownTimeline || beo.breakdownTimeline.length === 0) return ''

  const totalMinutes = beo.breakdownTimeline.reduce((sum, t) => sum + t.estimatedMinutes, 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMins = totalMinutes % 60

  const rows = beo.breakdownTimeline
    .map(
      (t) => `
      <tr>
        <td style="text-align:center">${t.order}</td>
        <td>${escape(t.task)}</td>
        <td style="text-align:center">${t.estimatedMinutes} min</td>
        <td>${escape(t.responsible)}</td>
      </tr>`
    )
    .join('')

  return `
    <div class="beo-section">
      <h2>Breakdown Timeline</h2>
      <p class="menu-desc">Estimated total breakdown: ${totalHours > 0 ? `${totalHours}h ` : ''}${remainingMins}min</p>
      <table class="info-table">
        <thead>
          <tr>
            <th style="text-align:center">#</th>
            <th>Task</th>
            <th style="text-align:center">Est. Time</th>
            <th>Responsible</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}
