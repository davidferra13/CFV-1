# Public Layer - How It Works Lifecycle Alignment

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Alignment with Event Lifecycle States

The "How It Works" page MUST accurately reflect the event lifecycle defined in the scope lock.

---

## Event Lifecycle States (From Scope Lock)

```
draft → proposed → accepted → paid → confirmed → in_progress → completed
  ↓        ↓          ↓        ↓        ↓            ↓
  └────────┴──────────┴────────┴────────┴────────────→ cancelled
```

---

## How It Works Steps Mapped to Lifecycle

| Step # | Description | Lifecycle State |
|--------|-------------|-----------------|
| 1 | Chef signs up | N/A (prerequisite) |
| 2 | Invite clients | N/A (prerequisite) |
| 3 | Create event | `draft` |
| 4 | Propose to client | `proposed` |
| 5 | Client accepts | `accepted` |
| 6 | Client pays deposit | `paid` → `confirmed` |
| 7 | Deliver service | `in_progress` → `completed` |

---

## Critical Alignment Rules

1. **Accurate State Names**: Use exact lifecycle state names (not marketing terms)
2. **Correct Sequence**: Steps must follow lifecycle order
3. **No Skipped States**: Every state must be represented
4. **Payment Clarity**: Explain that payment triggers `paid` → `confirmed` transition

---

## Content Guidelines

**DO**:
- ✅ "Chef proposes event to client" (matches `proposed` state)
- ✅ "Client pays deposit, event is confirmed" (matches `paid` → `confirmed`)

**DON'T**:
- ❌ "Chef books event" (no `booked` state exists)
- ❌ "Automatic confirmation" (incorrect - requires payment first)

---

**Status**: LOCKED for V1.
