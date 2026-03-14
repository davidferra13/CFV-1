-- =============================================================================
-- Migration: Social Event Hub — Event Themes
-- Layer: Hub Foundation
-- Purpose: Curated visual theme library for events and hub groups
-- =============================================================================

-- Theme table
CREATE TABLE IF NOT EXISTS event_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'celebration', 'corporate', 'holiday', 'seasonal', 'casual', 'formal'
  )),

  -- Visual definition (CSS-variable-ready)
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  background_gradient TEXT,
  font_display TEXT,
  emoji TEXT,
  description TEXT,

  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Enable RLS
ALTER TABLE event_themes ENABLE ROW LEVEL SECURITY;
-- Anyone can read themes (public catalog)
CREATE POLICY "event_themes_select_all" ON event_themes
  FOR SELECT USING (true);
-- Only service role can insert/update (admin seeding)
CREATE POLICY "event_themes_manage_service" ON event_themes
  FOR ALL USING (auth.role() = 'service_role');
-- Seed curated themes
INSERT INTO event_themes (slug, name, category, primary_color, secondary_color, accent_color, background_gradient, emoji, description, sort_order) VALUES
  ('bachelorette', 'Bachelorette', 'celebration', '#ec4899', '#f9a8d4', '#be185d', 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)', '💍', 'Pink and bubbly — perfect for the bride-to-be', 1),
  ('birthday', 'Birthday Bash', 'celebration', '#8b5cf6', '#c4b5fd', '#6d28d9', 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)', '🎂', 'Festive and fun for any age', 2),
  ('engagement', 'Engagement', 'celebration', '#f59e0b', '#fcd34d', '#d97706', 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)', '💛', 'Golden warmth for the happy couple', 3),
  ('baby-shower', 'Baby Shower', 'celebration', '#06b6d4', '#a5f3fc', '#0891b2', 'linear-gradient(135deg, #ecfeff 0%, #cffafe 50%, #a5f3fc 100%)', '🍼', 'Soft and sweet for the new arrival', 4),
  ('graduation', 'Graduation', 'celebration', '#1d4ed8', '#93c5fd', '#1e40af', 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)', '🎓', 'Achievement blue — celebrate the milestone', 5),
  ('corporate-dinner', 'Corporate Dinner', 'corporate', '#334155', '#94a3b8', '#1e293b', 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)', '🏢', 'Sleek and professional', 6),
  ('team-building', 'Team Building', 'corporate', '#0d9488', '#5eead4', '#0f766e', 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #99f6e4 100%)', '🤝', 'Fresh and collaborative', 7),
  ('holiday-feast', 'Holiday Feast', 'holiday', '#dc2626', '#fca5a5', '#b91c1c', 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%)', '🎄', 'Warm and festive for the holidays', 8),
  ('thanksgiving', 'Thanksgiving', 'holiday', '#b45309', '#fbbf24', '#92400e', 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)', '🦃', 'Autumn harvest warmth', 9),
  ('valentines', 'Valentine''s Day', 'holiday', '#e11d48', '#fda4af', '#be123c', 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #fecdd3 100%)', '❤️', 'Romantic reds and pinks', 10),
  ('new-years', 'New Year''s Eve', 'holiday', '#7c3aed', '#a78bfa', '#6d28d9', 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)', '🥂', 'Midnight glamour', 11),
  ('summer-bbq', 'Summer BBQ', 'seasonal', '#ea580c', '#fdba74', '#c2410c', 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)', '🔥', 'Sunny and casual vibes', 12),
  ('garden-party', 'Garden Party', 'seasonal', '#16a34a', '#86efac', '#15803d', 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)', '🌿', 'Fresh greens and natural beauty', 13),
  ('wine-tasting', 'Wine Tasting', 'casual', '#7f1d1d', '#dc2626', '#450a0a', 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 50%, #fecaca 100%)', '🍷', 'Deep burgundy sophistication', 14),
  ('date-night', 'Date Night', 'casual', '#9333ea', '#d8b4fe', '#7e22ce', 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)', '🌙', 'Intimate and romantic', 15),
  ('family-reunion', 'Family Reunion', 'casual', '#2563eb', '#93c5fd', '#1d4ed8', 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)', '👨‍👩‍👧‍👦', 'Warm and welcoming for the whole family', 16),
  ('black-tie', 'Black Tie', 'formal', '#111827', '#6b7280', '#030712', 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 50%, #e5e7eb 100%)', '🎩', 'Classic elegance', 17),
  ('tropical', 'Tropical Paradise', 'seasonal', '#0891b2', '#22d3ee', '#0e7490', 'linear-gradient(135deg, #ecfeff 0%, #cffafe 50%, #a5f3fc 100%)', '🌴', 'Island vibes and ocean breezes', 18)
ON CONFLICT (slug) DO NOTHING;
-- Add theme_id to event_shares
ALTER TABLE event_shares ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES event_themes(id) ON DELETE SET NULL;
-- Index
CREATE INDEX IF NOT EXISTS idx_event_themes_category ON event_themes(category) WHERE is_active = true;
