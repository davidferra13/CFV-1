'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { requireChef } from '@/lib/auth/get-user'
import {
  archiveRemyRoutine,
  createRemyRoutine,
  updateRemyRoutine,
} from '@/lib/ai/remy-routines-actions'
import type {
  RemyRoutineActionKind,
  RemyRoutineCondition,
  RemyRoutineTriggerType,
} from '@/lib/ai/remy-routines-types'

const DEFAULT_CONDITION_OPERATOR = 'contains'

function readString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function proposeRemyRoutineFromForm(formData: FormData) {
  await requireChef()

  const name = readString(formData, 'name')
  const description = readString(formData, 'description')
  const triggerType = (readString(formData, 'triggerType') || 'signal') as RemyRoutineTriggerType
  const conditionPath = readString(formData, 'conditionPath')
  const conditionValue = readString(formData, 'conditionValue')
  const actionKind = (readString(formData, 'actionKind') || 'queue_review') as RemyRoutineActionKind
  const actionLabel = readString(formData, 'actionLabel') || 'Queue chef review'
  const payloadNote = readString(formData, 'payloadNote')

  const conditions: RemyRoutineCondition[] =
    conditionPath && conditionValue
      ? [
          {
            path: conditionPath,
            operator: DEFAULT_CONDITION_OPERATOR,
            value: conditionValue,
          },
        ]
      : []

  await createRemyRoutine({
    name,
    description: description || null,
    status: 'paused',
    triggerType,
    triggerConfig: {},
    conditionGroup: { mode: 'all', conditions },
    actions: [
      {
        id: `routine-action-${randomUUID()}`,
        kind: actionKind,
        label: actionLabel,
        payload: payloadNote ? { note: payloadNote } : {},
        approvalRequired: true,
      },
    ],
    approvalRequired: true,
  })

  revalidatePath('/remy/settings')
}

export async function activateRemyRoutineFromForm(formData: FormData) {
  await requireChef()
  const routineId = readString(formData, 'routineId')
  await updateRemyRoutine(routineId, { status: 'active' })
  revalidatePath('/remy/settings')
}

export async function pauseRemyRoutineFromForm(formData: FormData) {
  await requireChef()
  const routineId = readString(formData, 'routineId')
  await updateRemyRoutine(routineId, { status: 'paused' })
  revalidatePath('/remy/settings')
}

export async function archiveRemyRoutineFromForm(formData: FormData) {
  await requireChef()
  const routineId = readString(formData, 'routineId')
  await archiveRemyRoutine(routineId)
  revalidatePath('/remy/settings')
}
