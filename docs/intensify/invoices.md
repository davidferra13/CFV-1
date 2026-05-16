# Intensify: Invoices

Zone covering: lib/invoices/, lib/events/invoice-actions.ts, lib/finance/invoice-payment-link-actions.ts, lib/finance/recurring-invoice-actions.ts, lib/documents/generate-invoice.ts, components/events/invoice-send-panel.tsx, components/events/invoice-view.tsx, components/client-portal/invoice-actions.tsx, components/dashboard/invoice-pulse-widget.tsx, app/(chef)/settings/invoice/, lib/email/templates/invoice-delivery.tsx, lib/loyalty/invoice-adjustments.ts

## Run 2026-05-16

STATUS: fresh
DEPTH: normal
YIELD_TREND: increasing

SURFACED:

- autoSendInvoiceOnFinalPayment exists in delivery-actions but has ZERO callers (dead function)
- processRecurringInvoices advances schedule dates but never sends (no-op processor)
- formatCents copy-pasted 3x (delivery-actions, pdf-generator, export-actions) with divergent implementations; canonical formatCurrency exists in lib/utils/currency.ts
- CIL finance analyzer overdue signal suggests "send reminder" but no reminder action exists
- CIL finance analyzer uses naive balance formula (quoted - paid) ignoring loyalty/beta/tax/refunds (potential false positives)

ACTED ON:

- Move 1: Wired autoSendInvoiceOnFinalPayment into Stripe webhook (payment_intent.succeeded), recordDeposit, recordBalancePayment
- Move 2: Created sendInvoiceForRecurring, wired into processRecurringInvoices
- Move 3: Replaced formatCents in delivery-actions + pdf-generator with formatCurrency; renamed export-actions copy to formatCentsRaw
- Move 4: Created lib/invoices/reminder-actions.ts (sendPaymentReminder + getLastReminderSent, 3-day spam guard)

SKIPPED:

- CSV export: premature (no user request, export-actions already handles commerce CSV)
- W-9 display toggle: low-yield (cosmetic PDF addition)
- Invoice history from client profile: premature (invoice_sends just landed, client profile needs broader redesign)
- CIL naive balance formula: premature (fix when false positives reported)

NEXT TRIGGER: After autoSendInvoiceOnFinalPayment wired + recurring processor sends real emails. Then target reminder actions + PDF end-to-end verification.
