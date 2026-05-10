-- Fix missing columns and tables causing dashboard crash
-- Safe: all operations are additive (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

-- 1. Add prep_sheet_generated_at and packing_list_generated_at to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS prep_sheet_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS packing_list_generated_at TIMESTAMPTZ;

-- 2. Create chef_tips table (from 20260502000001_chef_tips.sql)
CREATE TABLE IF NOT EXISTS public.chef_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  tags TEXT[] DEFAULT '{}',
  shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chef_tips_chef_created ON public.chef_tips (chef_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chef_tips_tags ON public.chef_tips USING GIN (tags);
