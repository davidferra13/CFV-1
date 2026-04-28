import type {
  PaymentStructure,
  PaymentStructureInstallment,
} from '@/lib/payments/payment-structure'

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function resolveDueDate(
  installment: PaymentStructureInstallment,
  eventDate: string | null
): string {
  const today = new Date()
  const event = eventDate ? new Date(eventDate) : null
  const validEventDate = event && !Number.isNaN(event.getTime()) ? event : null

  if (!validEventDate) return dateOnly(today)

  const dueLabel = installment.dueLabel.toLowerCase()
  if (dueLabel.includes('before service')) {
    const due = new Date(validEventDate)
    due.setDate(due.getDate() - 1)
    return dateOnly(due)
  }

  if (dueLabel.includes('midway')) {
    const halfway = new Date((today.getTime() + validEventDate.getTime()) / 2)
    return dateOnly(halfway)
  }

  return dateOnly(today)
}

export async function syncPaymentStructureToEventInstallments(input: {
  db: any
  tenantId: string
  eventId: string
  structure: PaymentStructure | null
}): Promise<{ success: boolean; insertedCount: number; skippedReason?: string }> {
  const { db, tenantId, eventId, structure } = input

  if (!structure || structure.installments.length === 0) {
    return { success: true, insertedCount: 0, skippedReason: 'no_payment_structure' }
  }

  const { count, error: countError } = await db
    .from('payment_plan_installments' as any)
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  if (countError) {
    throw new Error(`Failed to inspect existing payment plan: ${countError.message}`)
  }

  if ((count ?? 0) > 0) {
    return { success: true, insertedCount: 0, skippedReason: 'existing_plan' }
  }

  const { data: event, error: eventError } = await db
    .from('events')
    .select('event_date')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) {
    throw new Error(eventError?.message || 'Event not found for payment plan sync')
  }

  const rows = structure.installments
    .filter((installment) => installment.amountCents > 0)
    .map((installment, index) => ({
      event_id: eventId,
      tenant_id: tenantId,
      installment_num: index + 1,
      label: installment.payerLabel
        ? `${installment.payerLabel}: ${installment.label}`
        : installment.label,
      amount_cents: installment.amountCents,
      due_date: resolveDueDate(installment, event.event_date ?? null),
      notes: `${structure.label}. Due ${installment.dueLabel}.`,
    }))

  if (rows.length === 0) {
    return { success: true, insertedCount: 0, skippedReason: 'no_positive_installments' }
  }

  const { error } = await db.from('payment_plan_installments' as any).insert(rows)
  if (error) {
    throw new Error(`Failed to create payment plan installments: ${error.message}`)
  }

  return { success: true, insertedCount: rows.length }
}
