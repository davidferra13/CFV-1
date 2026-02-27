# Device Kiosk & Fleet Provisioning

> Feature added: 2026-02-27
> Status: Complete (v1 — inquiry flow)

## Overview

ChefFlow supports dedicated kiosk devices (tablets) that run a restricted surface of the app for customer-facing workflows. The owner provisions devices, staff identify themselves via PIN, and the kiosk only allows inquiry submission — nothing else.

## Architecture

```
Owner creates device in Settings → Devices
  ↓
Gets pairing code (8 chars, expires 15 min) + QR code
  ↓
Tablet opens /kiosk/pair → enters code → device paired
  ↓ (device token stored in localStorage)
Staff enters 4-6 digit PIN → verified against staff_members
  ↓ (staff session in memory only)
Customer fills inquiry form → submit → success screen
  ↓ (auto-reset after 10s)
90 seconds idle → staff session ends → PIN entry screen
```

## Auth Model

**Two layers, no Supabase Auth required on kiosk:**

1. **Device token** — random 32 bytes, SHA-256 hashed in DB (`devices.token_hash`). Sent as `Authorization: Bearer <token>` on every API call. Shown once during pairing, never retrievable. Persisted in localStorage.

2. **Staff PIN** — 4-6 digit code, SHA-256 hashed in `staff_members.kiosk_pin`. Unique within a tenant. Validated server-side. Session stored in React state only (cleared on idle timeout or navigation).

**Server-side enforcement:**

- All `/api/kiosk/*` routes validate the device token
- `tenant_id` is derived from the device record, never from client input
- Kiosk can only INSERT inquiries and device events — zero read access
- Admin client (service role key) used for all kiosk DB operations

## Database

### New Tables

| Table             | Purpose                                             |
| ----------------- | --------------------------------------------------- |
| `devices`         | Fleet registry — one row per physical device        |
| `device_sessions` | Staff usage tracking — one row per PIN entry        |
| `device_events`   | Audit log — paired, heartbeat, reset, inquiry, etc. |

### New Enums

| Enum            | Values                                  |
| --------------- | --------------------------------------- |
| `device_type`   | ipad, android, browser                  |
| `device_status` | pending_pair, active, disabled, revoked |
| `device_mode`   | kiosk                                   |
| `kiosk_flow`    | inquiry, checkin, menu_browse, order    |

### Modified Tables

| Table                  | Change                                       |
| ---------------------- | -------------------------------------------- |
| `staff_members`        | Added `kiosk_pin TEXT` column (SHA-256 hash) |
| `inquiry_channel` enum | Added `'kiosk'` value                        |

### Migration

`supabase/migrations/20260327000007_device_kiosk_fleet.sql`

## Routes

### Kiosk Routes (public, no auth)

| Route             | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `/kiosk`          | Main kiosk screen (PIN entry → form → success) |
| `/kiosk/pair`     | Pairing screen (enter code or scan QR)         |
| `/kiosk/disabled` | "Device disabled" screen                       |

### API Routes (public, device token validated)

| Route                    | Method | Purpose                                 |
| ------------------------ | ------ | --------------------------------------- |
| `/api/kiosk/pair`        | POST   | Verify pairing code, issue device token |
| `/api/kiosk/verify-pin`  | POST   | Validate staff PIN, create session      |
| `/api/kiosk/heartbeat`   | POST   | Update last_seen, check device status   |
| `/api/kiosk/inquiry`     | POST   | Submit customer inquiry                 |
| `/api/kiosk/status`      | GET    | Get device status + config              |
| `/api/kiosk/end-session` | POST   | End staff session (idle/manual)         |

### Chef Portal

| Route               | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `/settings/devices` | Device fleet management + staff PIN management |

## Key Files

| File                                         | Purpose                                    |
| -------------------------------------------- | ------------------------------------------ |
| `lib/devices/types.ts`                       | TypeScript interfaces                      |
| `lib/devices/token.ts`                       | Token/PIN generation, hashing, validation  |
| `lib/devices/actions.ts`                     | Server actions (chef CRUD, PIN management) |
| `app/kiosk/layout.tsx`                       | Minimal kiosk layout                       |
| `app/kiosk/page.tsx`                         | Main kiosk controller                      |
| `components/kiosk/staff-pin-entry.tsx`       | Touch-friendly PIN pad                     |
| `components/kiosk/kiosk-inquiry-form.tsx`    | Customer inquiry form                      |
| `components/kiosk/idle-reset-provider.tsx`   | Inactivity timer                           |
| `components/kiosk/heartbeat-provider.tsx`    | 30s heartbeat                              |
| `components/devices/device-list.tsx`         | Device fleet table                         |
| `components/devices/create-device-modal.tsx` | Create device + show pairing               |
| `components/devices/staff-pin-manager.tsx`   | Set/remove staff PINs                      |

## Security

1. Kiosk routes are public (like `/embed`) — added to `skipAuthPaths` in middleware
2. Device tokens are SHA-256 hashed — raw token never stored in DB
3. Pairing codes expire after 15 minutes and are cleared after use
4. Staff PINs are SHA-256 hashed — unique per tenant
5. Heartbeat detects disabled/revoked devices within 30 seconds
6. Rate limiting: max 10 inquiry submissions per 5 minutes per device
7. Heartbeat events rate-limited to 1 DB insert per 5 minutes (always updates `last_seen_at`)
8. Staff session state is in React memory only — never persisted to localStorage

## Kiosk Staff Permissions

### What staff CAN do

- Enter their PIN to identify themselves
- Submit new customer inquiries (name, contact, date, party size, notes)
- Start a new inquiry after submission
- See the business name in the header

### What staff CANNOT do

- Access the chef portal, dashboard, or settings
- View existing clients, inquiries, events, or financial data
- Modify or delete any records
- Access menus, recipes, calendar, or any other feature
- Unpair or reconfigure the device (requires 3-second long-press)
- Navigate away from the kiosk screen

## Hard Reset

Long-press (3 seconds) on the business name in the kiosk header reveals a "Reset Device" button. This clears the device token from localStorage and redirects to `/kiosk/pair`. The device must be re-paired to continue.

## Idle Reset

After `idle_timeout_seconds` (default 90) of no touch/mouse/keyboard activity:

- Staff session ends (device_event logged)
- Form state cleared
- Returns to PIN entry screen (device stays paired)

## Online Status

The device list shows real-time status based on `last_seen_at`:

- **Online** (green) — last seen < 2 minutes ago
- **Stale** (yellow) — last seen 2-10 minutes ago
- **Offline** (red) — last seen > 10 minutes ago

## Manual QA Checklist

1. Create device in Settings → Devices → verify pairing code + QR shown
2. Open `/kiosk/pair` in incognito → enter code → verify paired, redirects to `/kiosk`
3. Set staff PIN → enter PIN on kiosk → verify staff name appears in header
4. Wrong PIN → verify shake animation + "Invalid PIN" message
5. Submit inquiry → verify it appears in Inquiries list with `channel='kiosk'`
6. Wait 90s idle → verify returns to PIN screen (not pairing screen)
7. Disable device from Settings → verify kiosk shows disabled screen within 30s
8. Long-press header 3s → verify hard reset clears token, shows pairing screen
9. Device list shows correct online/stale/offline badges

## iPad Guided Access (Future)

For production iPad deployments, enable Guided Access:

1. Settings → Accessibility → Guided Access → On
2. Open Safari to `https://app.cheflowhq.com/kiosk/pair`
3. Triple-click Home/Side button to start Guided Access
4. Set a Guided Access passcode (separate from staff PINs)
5. Disable hardware buttons as needed

This locks the iPad to Safari showing only the kiosk page. Combined with app-level kiosk restrictions, this creates a fully locked-down kiosk experience.
