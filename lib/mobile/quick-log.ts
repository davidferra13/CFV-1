// Quick Log Parser
// Parses free-text input into structured entries: expense, note, or task.
// "expense $47 Costco" -> expense
// "note: client loved the risotto" -> note
// "task: order truffle oil" -> task

export type QuickLogType = 'expense' | 'note' | 'task'

export type QuickLogEntry = {
  type: QuickLogType
  raw: string
  amount_cents?: number
  vendor?: string
  description: string
}

/**
 * Parse free-text input into a structured quick log entry.
 * Detection rules:
 *   - expense: contains a $ amount (e.g. "$47", "$12.50")
 *   - note: starts with "note:" or "note "
 *   - task: starts with "task:" or "task " or "todo:" or "todo "
 *   - fallback: treated as a note
 */
export function parseQuickLog(text: string): QuickLogEntry {
  const trimmed = text.trim()
  if (!trimmed) {
    return { type: 'note', raw: trimmed, description: '' }
  }

  // Check for task prefix
  const taskMatch = trimmed.match(/^(?:task|todo)\s*:\s*/i)
  if (taskMatch) {
    return {
      type: 'task',
      raw: trimmed,
      description: trimmed.slice(taskMatch[0].length).trim(),
    }
  }

  // Check for note prefix
  const noteMatch = trimmed.match(/^note\s*:\s*/i)
  if (noteMatch) {
    return {
      type: 'note',
      raw: trimmed,
      description: trimmed.slice(noteMatch[0].length).trim(),
    }
  }

  // Check for expense (contains $amount)
  const expenseMatch = trimmed.match(/\$\s*(\d+(?:\.\d{1,2})?)/)
  if (expenseMatch) {
    const amount = parseFloat(expenseMatch[1])
    const amountCents = Math.round(amount * 100)

    // Everything after the amount is vendor/description
    const afterAmount = trimmed.slice(trimmed.indexOf(expenseMatch[0]) + expenseMatch[0].length).trim()
    // Everything before $ (minus "expense" prefix if present)
    let beforeAmount = trimmed.slice(0, trimmed.indexOf(expenseMatch[0])).trim()
    beforeAmount = beforeAmount.replace(/^expense\s*/i, '').trim()

    // Try to extract vendor: first word after the amount, or before
    const vendor = afterAmount.split(/\s+/)[0] || beforeAmount || undefined
    const description = afterAmount || beforeAmount || `Expense $${amount.toFixed(2)}`

    return {
      type: 'expense',
      raw: trimmed,
      amount_cents: amountCents,
      vendor,
      description,
    }
  }

  // Check for "expense" prefix without $ (e.g. "expense 47 costco")
  const expenseWordMatch = trimmed.match(/^expense\s+(\d+(?:\.\d{1,2})?)\s*(.*)/i)
  if (expenseWordMatch) {
    const amount = parseFloat(expenseWordMatch[1])
    const rest = expenseWordMatch[2].trim()
    return {
      type: 'expense',
      raw: trimmed,
      amount_cents: Math.round(amount * 100),
      vendor: rest.split(/\s+/)[0] || undefined,
      description: rest || `Expense $${amount.toFixed(2)}`,
    }
  }

  // Fallback: treat as note
  return {
    type: 'note',
    raw: trimmed,
    description: trimmed,
  }
}

/**
 * Detect the type as the user is typing (for the badge).
 * Returns the detected type without full parsing.
 */
export function detectQuickLogType(text: string): QuickLogType {
  const trimmed = text.trim().toLowerCase()
  if (!trimmed) return 'note'
  if (/^(?:task|todo)\s*:/i.test(trimmed)) return 'task'
  if (/^note\s*:/i.test(trimmed)) return 'note'
  if (/\$\s*\d/.test(trimmed) || /^expense\s+\d/i.test(trimmed)) return 'expense'
  return 'note'
}
