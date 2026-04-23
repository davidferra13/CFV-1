'use client'

import { useState } from 'react'
import { RecurringTaskConfig } from './recurring-task-config'
import type { RecurringRule } from '@/lib/tasks/actions'
import { parseTaskCreateRecurringRule } from '@/lib/tasks/create-form-state'

export function TaskCreateRecurringField({
  initialSerializedRule,
}: {
  initialSerializedRule: string
}) {
  const [recurringRule, setRecurringRule] = useState<RecurringRule | null>(() =>
    parseTaskCreateRecurringRule(initialSerializedRule)
  )

  return (
    <>
      <input
        type="hidden"
        name="recurring_rule"
        value={recurringRule ? JSON.stringify(recurringRule) : ''}
      />
      <RecurringTaskConfig value={recurringRule} onChange={setRecurringRule} />
    </>
  )
}
