export interface ClientDeletionStatus {
  isPending: boolean
  requestedAt: string | null
  scheduledFor: string | null
  daysRemaining: number | null
}
