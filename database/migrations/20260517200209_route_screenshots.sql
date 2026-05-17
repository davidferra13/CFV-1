-- Route Screenshot Gallery and Design Review Board
-- Tables for automated route screenshots, design review comments, and approval workflow

CREATE TABLE IF NOT EXISTS route_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  viewport TEXT NOT NULL CHECK (viewport IN ('desktop', 'tablet', 'mobile')),
  screenshot_url TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_route_screenshots_tenant_route ON route_screenshots (tenant_id, route);

CREATE TABLE IF NOT EXISTS design_review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  screenshot_id UUID NOT NULL REFERENCES route_screenshots(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  x INTEGER NOT NULL DEFAULT 0,
  y INTEGER NOT NULL DEFAULT 0,
  comment TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_design_review_comments_screenshot ON design_review_comments (tenant_id, screenshot_id);

CREATE TABLE IF NOT EXISTS route_design_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  route TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'needs-changes', 'rejected')),
  reviewer_id UUID,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, route)
);

CREATE INDEX idx_route_design_reviews_tenant_route ON route_design_reviews (tenant_id, route);
