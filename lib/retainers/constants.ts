// Retainer/Subscription module constants
// No 'use server' — exports const values for use in both client and server code.

export const RETAINER_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

export const BILLING_CYCLE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
}

export const PERIOD_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
}

// Status → badge variant mapping (for use in UI components)
export const RETAINER_STATUS_VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  draft: 'default',
  active: 'success',
  paused: 'warning',
  cancelled: 'error',
  completed: 'info',
}

export const PERIOD_STATUS_VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  pending: 'default',
  paid: 'success',
  overdue: 'error',
  void: 'warning',
}
