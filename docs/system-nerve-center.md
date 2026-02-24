# System Nerve Center

## What It Is

A unified dashboard panel that monitors all 15 ChefFlow services at a glance and provides one-click self-healing buttons. Admin-only — non-admins don't see it.

## Why It Exists

ChefFlow has 15+ independent services (Ollama, Supabase, Stripe, Resend, Pi, tunnel, etc.). When something breaks, the fix is usually simple (restart Ollama, reset a circuit breaker, restart PM2) but diagnosing _which_ thing is broken and running the right command wastes time. The Nerve Center centralizes all of this into one place.

## How It Works

### Architecture

```
Dashboard UI (client)
  └─ GET /api/system/health     → Full sweep (read-only)
  └─ POST /api/system/heal      → Execute fixes or sweep-all
       └─ lib/system/heal-actions.ts   → Server actions
       └─ lib/system/health-sweep.ts   → Sweep engine
       └─ lib/system/types.ts          → Shared types
```

### Dependency Hierarchy

Services are checked in tier order. If a lower tier is down, dependent higher tiers are skipped:

| Tier | Services                                                 | Depends On            |
| ---- | -------------------------------------------------------- | --------------------- |
| 0    | Internet                                                 | (nothing)             |
| 1    | Database (Supabase)                                      | Internet              |
| 2    | Auth                                                     | Database              |
| 3    | Dev Server                                               | (nothing)             |
| 4    | Ollama PC, Ollama Pi                                     | (nothing)             |
| 5    | Stripe, Resend, Gmail, Maps, Spoonacular, Kroger, MealMe | Internet              |
| 6    | Beta Server (PM2), CF Tunnel                             | Internet, Beta Server |

### Available Fix Actions

| Action        | Service                                                     | What It Does                                                            |
| ------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| Wake          | Ollama PC/Pi                                                | Start Ollama service                                                    |
| Restart       | Ollama PC/Pi                                                | Full service restart                                                    |
| Load Model    | Ollama PC/Pi                                                | Pre-load model into VRAM                                                |
| Reset Breaker | Stripe, Resend, Supabase, Maps, Spoonacular, Kroger, MealMe | Reset circuit breaker to CLOSED                                         |
| Restart PM2   | Beta Server                                                 | `pm2 restart chefflow-beta` via SSH (dangerous — requires confirmation) |

### Sweep All

The "Sweep All" button:

1. Checks all services in dependency order
2. Auto-fixes anything broken (except dangerous actions)
3. Re-checks after each fix to verify it worked
4. Reports results via toast notification

### Polling

- All healthy: every 120 seconds
- Any degraded: every 30 seconds
- Any error: every 15 seconds

## File Locations

| File                                           | Purpose                         |
| ---------------------------------------------- | ------------------------------- |
| `lib/system/types.ts`                          | Shared interfaces               |
| `lib/system/health-sweep.ts`                   | Service registry + sweep engine |
| `lib/system/heal-actions.ts`                   | Server actions for fixes        |
| `app/api/system/health/route.ts`               | GET health check endpoint       |
| `app/api/system/heal/route.ts`                 | POST fix/sweep endpoint         |
| `components/dashboard/system-nerve-center.tsx` | Dashboard UI panel              |

## Integration

- Widget ID: `system_nerve_center` in `lib/scheduling/types.ts`
- Rendered in `app/(chef)/dashboard/page.tsx`
- Admin-only: component checks auth on mount, renders nothing for non-admins
- Reuses existing: `ollama-wake.ts`, `circuit-breaker.ts`, `providers.ts`, `admin.ts`

## See Also

- `docs/failure-modes-manual.md` — Complete catalog of all 95 failure modes
- `lib/ai/cross-monitor.ts` — Background Ollama supervisor (30s polling)
- `lib/resilience/circuit-breaker.ts` — Circuit breaker implementation
