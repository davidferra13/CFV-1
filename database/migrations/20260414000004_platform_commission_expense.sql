-- Add platform_commission to expense_category enum
-- Enables chefs to record TakeAChef, Wix, and other marketplace fees as real cost lines
-- This ensures P&L accurately reflects net profit after platform deductions

ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'platform_commission';
