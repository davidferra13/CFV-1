# ECS Gap: Guest Photo Upload Size Validation

> Source: ECS Scorecard 2026-04-27 | User Type: Guest (85/100) | Dimension: Polish (15/20)

## Problem
Guest photo upload mentions a 10MB limit in text but has no client-side file size validation before upload attempt.

## Spec
1. Read `components/sharing/guest-photo-gallery.tsx`
2. Find the file input/upload handler
3. Add client-side validation: reject files > 10MB before upload
4. Show inline error: "Photo must be under 10MB. Please choose a smaller file."
5. Also validate file type (only images: jpg, png, webp, heic)

## Acceptance
- Files > 10MB rejected client-side with clear message
- Non-image files rejected with clear message
- No wasted upload bandwidth on oversized files
