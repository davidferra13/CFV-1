// ---------------------------------------------------------------------------
// Circle Approval Flow Types
// ---------------------------------------------------------------------------

export type ApprovalMode = 'auto' | 'manual'

export type RequestStatus = 'pending' | 'approved' | 'rejected'

export type JoinRequest = {
  id: string
  circleId: string
  guestName: string
  guestEmail: string
  guestPhone: string | null
  message: string | null
  status: RequestStatus
  reviewedBy: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  createdAt: string
}

export type GuestInput = {
  name: string
  email: string
  phone?: string
  message?: string
}
