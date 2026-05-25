'use server'

import { requireChef } from '@/lib/auth/get-user'
import { sendEmail } from '@/lib/email/send'
import type { ShoppingListResult } from './shopping-list-actions'
import { formatPlainText } from './shopping-list-utils'
import React from 'react'

// Pure formatting functions (formatPlainText, formatPerVendorText,
// getVendorOrderSummary, VendorSummary) now live in ./shopping-list-utils.ts.
// Import directly from there; sync functions cannot be exported from 'use server' files.

// ── Email Share ──────────────────────────────────────────────────────────

export async function emailShoppingList(
  result: ShoppingListResult,
  toEmail: string
): Promise<{ success: boolean }> {
  await requireChef()

  const plainText = formatPlainText(result, { shortagesOnly: true })
  const subject = `Shopping List - ${result.startDate} to ${result.endDate}`

  try {
    await sendEmail({
      to: toEmail,
      subject,
      react: React.createElement('pre', {
        style: {
          fontFamily: 'monospace',
          fontSize: '13px',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.5',
        },
        children: plainText,
      }),
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}
