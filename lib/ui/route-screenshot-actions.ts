'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  RouteScreenshot,
  ScreenshotViewport,
  DesignReviewComment,
  DesignReviewStatus,
  RouteDesignReview,
  ScreenshotGallerySummary,
} from './route-screenshot-types'

export async function getRouteScreenshots(route?: string): Promise<RouteScreenshot[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM route_screenshots WHERE tenant_id = $1'
  if (route) {
    query += ' AND route = $2'
    params.push(route)
  }
  query += ' ORDER BY route, viewport, version DESC'
  const rows = await db.query(query, params)
  return rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    viewport: r.viewport as ScreenshotViewport,
    screenshotUrl: r.screenshot_url,
    capturedAt: new Date(r.captured_at),
    version: r.version ?? 1,
  }))
}

export async function createRouteScreenshot(params: {
  route: string
  viewport: ScreenshotViewport
  screenshotUrl: string
  version?: number
}): Promise<RouteScreenshot> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO route_screenshots (tenant_id, route, viewport, screenshot_url, version)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [user.tenantId, params.route, params.viewport, params.screenshotUrl, params.version ?? 1],
  )
  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    viewport: r.viewport as ScreenshotViewport,
    screenshotUrl: r.screenshot_url,
    capturedAt: new Date(r.captured_at),
    version: r.version ?? 1,
  }
}

export async function getDesignReviewComments(screenshotId: string): Promise<DesignReviewComment[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'SELECT * FROM design_review_comments WHERE tenant_id = $1 AND screenshot_id = $2 ORDER BY created_at ASC',
    [user.tenantId, screenshotId],
  )
  return rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    screenshotId: r.screenshot_id,
    authorId: r.author_id,
    x: r.x,
    y: r.y,
    comment: r.comment,
    resolved: r.resolved ?? false,
    createdAt: new Date(r.created_at),
  }))
}

export async function addDesignReviewComment(params: {
  screenshotId: string
  x: number
  y: number
  comment: string
}): Promise<DesignReviewComment> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO design_review_comments (tenant_id, screenshot_id, author_id, x, y, comment)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [user.tenantId, params.screenshotId, user.id, params.x, params.y, params.comment],
  )
  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    screenshotId: r.screenshot_id,
    authorId: r.author_id,
    x: r.x,
    y: r.y,
    comment: r.comment,
    resolved: r.resolved ?? false,
    createdAt: new Date(r.created_at),
  }
}

export async function resolveDesignReviewComment(commentId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  await db.query(
    'UPDATE design_review_comments SET resolved = true WHERE id = $1 AND tenant_id = $2',
    [commentId, user.tenantId],
  )
}

export async function updateRouteDesignReview(
  route: string,
  status: DesignReviewStatus,
): Promise<RouteDesignReview> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO route_design_reviews (tenant_id, route, status, reviewer_id, last_reviewed_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (tenant_id, route)
     DO UPDATE SET status = $3, reviewer_id = $4, last_reviewed_at = NOW()
     RETURNING *`,
    [user.tenantId, route, status, user.id],
  )
  const r = rows[0]
  const commentRows = await db.query(
    `SELECT COUNT(*)::int as cnt FROM design_review_comments dc
     JOIN route_screenshots rs ON rs.id = dc.screenshot_id
     WHERE dc.tenant_id = $1 AND rs.route = $2`,
    [user.tenantId, route],
  )
  return {
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    status: r.status as DesignReviewStatus,
    reviewerId: r.reviewer_id,
    comments: commentRows[0]?.cnt ?? 0,
    lastReviewedAt: r.last_reviewed_at ? new Date(r.last_reviewed_at) : null,
    createdAt: new Date(r.created_at),
  }
}

export async function getRouteDesignReviews(): Promise<RouteDesignReview[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `SELECT rdr.*,
       (SELECT COUNT(*)::int FROM design_review_comments dc
        JOIN route_screenshots rs ON rs.id = dc.screenshot_id
        WHERE dc.tenant_id = rdr.tenant_id AND rs.route = rdr.route) as comment_count
     FROM route_design_reviews rdr
     WHERE rdr.tenant_id = $1
     ORDER BY rdr.last_reviewed_at DESC NULLS LAST`,
    [user.tenantId],
  )
  return rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    status: r.status as DesignReviewStatus,
    reviewerId: r.reviewer_id,
    comments: r.comment_count ?? 0,
    lastReviewedAt: r.last_reviewed_at ? new Date(r.last_reviewed_at) : null,
    createdAt: new Date(r.created_at),
  }))
}

export async function getScreenshotGallerySummary(): Promise<ScreenshotGallerySummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const ssRows = await db.query(
    `SELECT COUNT(*)::int as total, COUNT(DISTINCT route)::int as routes
     FROM route_screenshots WHERE tenant_id = $1`,
    [user.tenantId],
  )
  const reviewRows = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
       COUNT(*) FILTER (WHERE status = 'approved')::int as approved
     FROM route_design_reviews WHERE tenant_id = $1`,
    [user.tenantId],
  )
  return {
    totalScreenshots: ssRows[0]?.total ?? 0,
    totalRoutes: ssRows[0]?.routes ?? 0,
    pendingReviews: reviewRows[0]?.pending ?? 0,
    approvedRoutes: reviewRows[0]?.approved ?? 0,
  }
}
