# ChefFlow Beta Hosting — Self-Hosted via Cloudflare Tunnel

> **Cost: $0/month.** Your app runs on your own hardware. Cloudflare handles routing, HTTPS, and security for free.

---

## Quick Start (30 seconds)

Want to send someone a link right now?

```bash
# Option A: If your dev server is already running on port 3100
npm run beta:quick

# Option B: Full production build + tunnel (slower start, faster app)
npm run beta
```

Both commands print a URL like `https://random-words.trycloudflare.com`. Text it to your tester. Done.

---

## How It Works

```
Tester's phone/laptop
        ↓
https://random-words.trycloudflare.com  (or beta.cheflowhq.com)
        ↓
Cloudflare's network  (free — handles HTTPS, DDoS protection)
        ↓
Cloudflare Tunnel  (encrypted connection to your PC)
        ↓
Your PC running ChefFlow  (localhost:3100)
        ↓
Supabase  (database — already hosted)
```

No ports opened on your router. No IP address exposed. Cloudflare handles everything.

---

## NPM Scripts

| Command              | What it does                                                            |
| -------------------- | ----------------------------------------------------------------------- |
| `npm run beta:quick` | Instant tunnel to whatever's running on port 3100 (dev or prod)         |
| `npm run beta`       | Builds production app, starts server, opens tunnel                      |
| `npm run beta:named` | Uses permanent `beta.cheflowhq.com` URL (requires one-time setup below) |
| `npm run beta:build` | Just builds + starts the production server (no tunnel)                  |

---

## Permanent URL Setup (beta.cheflowhq.com)

The quick tunnel gives a random URL that changes every restart. For a stable URL:

### One-time setup

```bash
# 1. Login to Cloudflare (opens browser — click your domain, click Authorize)
cloudflared tunnel login

# 2. Create the tunnel
cloudflared tunnel create chefflow-beta

# 3. Point beta.cheflowhq.com to the tunnel
cloudflared tunnel route dns chefflow-beta beta.cheflowhq.com
```

### Run it

```bash
npm run beta:named
```

Your testers visit `https://beta.cheflowhq.com` — same URL every time, works 24/7 as long as your PC is on.

---

## Quick Tunnel vs Named Tunnel

|                          | Quick Tunnel                | Named Tunnel                     |
| ------------------------ | --------------------------- | -------------------------------- |
| URL                      | Random (changes on restart) | `beta.cheflowhq.com` (permanent) |
| Setup                    | Zero                        | 3 commands (one-time)            |
| Cloudflare login needed? | No                          | Yes                              |
| Best for                 | "Try this real quick"       | 6-month beta test                |
| HTTPS                    | Automatic                   | Automatic                        |

---

## Important Notes

### NordVPN

You run NordVPN (NordLynx). This usually works fine with Cloudflare Tunnel, but if testers can't connect:

- Try split-tunneling: exclude `cloudflared` from VPN in NordVPN settings
- Or temporarily disconnect VPN while hosting

### PC Sleep

If your PC sleeps, the tunnel dies. During beta testing:

- Windows Settings → Power → Screen and sleep → Set "Sleep" to **Never**
- Or just keep the PC awake while testers are active

### Security

- Your app already has authentication (Supabase Auth) — testers need accounts
- The tunnel doesn't bypass your app's login system
- Cloudflare provides DDoS protection and rate limiting automatically
- No ports are opened on your router — your home network stays protected

### Performance

- `npm run beta` uses a production build — 2-5x faster than dev mode
- `npm run beta:quick` tunnels whatever's running (dev or prod) — fine for testing
- Cloudflare edge caches static assets — testers far from you still get fast loads

---

## Moving to the Raspberry Pi (24/7 hosting)

If you want the beta to be available even when your PC is off:

1. Deploy a production build to the Pi
2. Install cloudflared on the Pi (it's ARM64-compatible)
3. Run the tunnel as a systemd service (auto-starts on boot)
4. The Pi draws ~5 watts — runs 24/7 for pennies

This is a future enhancement — your PC is the right starting point.

---

## File Locations

| What                           | Where                     |
| ------------------------------ | ------------------------- |
| Beta serve script (bash)       | `scripts/beta-serve.sh`   |
| Beta serve script (PowerShell) | `scripts/beta-serve.ps1`  |
| Tunnel config (named tunnel)   | `.cloudflared/config.yml` |
| This doc                       | `docs/beta-hosting.md`    |

---

_Created 2026-02-23. Self-hosting ChefFlow for beta testing._
