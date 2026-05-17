export type ScreenshotViewport = 'desktop' | 'tablet' | 'mobile'

export type DesignReviewStatus = 'pending' | 'approved' | 'needs-changes' | 'rejected'

export type RouteScreenshot = {
  id: string
  tenantId: string
  route: string
  viewport: ScreenshotViewport
  screenshotUrl: string
  capturedAt: Date
  version: number
}

export type DesignReviewComment = {
  id: string
  tenantId: string
  screenshotId: string
  authorId: string
  x: number
  y: number
  comment: string
  resolved: boolean
  createdAt: Date
}

export type RouteDesignReview = {
  id: string
  tenantId: string
  route: string
  status: DesignReviewStatus
  reviewerId: string | null
  comments: number
  lastReviewedAt: Date | null
  createdAt: Date
}

export type ScreenshotGallerySummary = {
  totalScreenshots: number
  totalRoutes: number
  pendingReviews: number
  approvedRoutes: number
}
