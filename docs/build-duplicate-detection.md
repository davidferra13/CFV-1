# Build: Duplicate Client Detection (#41)

**Date:** 2026-03-12
**Branch:** `feature/risk-gap-closure`
**Roadmap Item:** #41 Duplicate Detection (build order #47)

## What Changed

Built a client duplicate detection and merge system with fuzzy matching on name, email, and phone.

### New Files

1. **`lib/clients/duplicate-detection.ts`** - Detection engine with three functions:
   - `findDuplicateClients()` - Scans all active clients, compares every pair using weighted scoring. Returns duplicate groups sorted by match score.
   - `checkForDuplicatesBeforeCreate(input)` - Pre-creation check that returns potential matches for a given name/email/phone before a new client is added. Threshold is lower (40) to catch more potential issues.
   - `mergeClients(targetId, sourceId)` - Moves all events, inquiries, ledger entries, and conversations from source to target client. Soft-deletes the source with a merge note.

2. **`components/clients/duplicate-merge-panel.tsx`** - UI panel showing:
   - Duplicate groups with match score badge (color-coded: red 80%+, yellow 60%+, blue below)
   - Match reasons (same email, same phone, similar name)
   - Client details (name, email, phone, event count)
   - One-click merge button (keeps the client with more events)
   - Confirmation modal before merge

### Modified Files

- **`app/(chef)/clients/page.tsx`** - Added `<DuplicateMergePanel />` between rebooking bar and client list

## Scoring System

| Signal          | Max Points | Condition                                                          |
| --------------- | ---------- | ------------------------------------------------------------------ |
| Email match     | 50         | Exact case-insensitive match                                       |
| Phone match     | 40         | Digits match after normalization (strips country code, non-digits) |
| Name similarity | 40         | Levenshtein-based score >= 70% after normalization                 |

Threshold for flagging: 50 points (existing scan) or 40 points (pre-creation check).

### Name Normalization

- Lowercase, trim, collapse whitespace
- Strip honorifics (Mr, Mrs, Dr) and suffixes (Jr, Sr, II, III)
- Word overlap detection (catches "John Smith" vs "Smith, John")
- Levenshtein distance for typos ("Jon Smith" vs "John Smith")

### Phone Normalization

- Strip all non-digit characters
- Remove leading 1 (US country code) if 11 digits

## Design Decisions

- **No AI** - Pure string matching and Levenshtein distance. Formula > AI.
- **Weighted scoring** - Email is the strongest signal (50pts) since it's unique per person. Name alone never exceeds 40pts to avoid false positives.
- **Keep the richer record** - Merge button defaults to keeping the client with more events.
- **Non-destructive merge** - Source client is soft-deleted with a merge note, not hard-deleted.
- **Lazy-loaded panel** - Suspense wrapper so the duplicate scan doesn't block page load.
