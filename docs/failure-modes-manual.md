# ChefFlow V1 — Complete Failure Modes Manual

> **Every single thing that can break, what it looks like, and how to fix it.**
>
> Covers: localhost dev, beta (Pi), production (Vercel), Ollama, Supabase, Stripe,
> email, APIs, auth, builds, deploys, networking, multi-agent, and more.

---

## Table of Contents

1. [Dev Server (localhost:3100)](#1-dev-server-localhost3100)
2. [Next.js Build System](#2-nextjs-build-system)
3. [Ollama / Local AI](#3-ollama--local-ai)
4. [Raspberry Pi (Beta Server)](#4-raspberry-pi-beta-server)
5. [Cloudflare Tunnel (Beta URL)](#5-cloudflare-tunnel-beta-url)
6. [Vercel (Production)](#6-vercel-production)
7. [Supabase (Database + Auth)](#7-supabase-database--auth)
8. [Authentication & Sessions](#8-authentication--sessions)
9. [Stripe (Payments)](#9-stripe-payments)
10. [Resend (Email)](#10-resend-email)
11. [Gmail Sync](#11-gmail-sync)
12. [Grocery Pricing APIs](#12-grocery-pricing-apis)
13. [Google Maps](#13-google-maps)
14. [Circuit Breakers (All Services)](#14-circuit-breakers-all-services)
15. [PWA / Service Worker](#15-pwa--service-worker)
16. [Supabase Realtime (WebSockets)](#16-supabase-realtime-websockets)
17. [Multi-Agent / Concurrent Work](#17-multi-agent--concurrent-work)
18. [Git / GitHub](#18-git--github)
19. [Environment Variables](#19-environment-variables)
20. [Data Integrity](#20-data-integrity)
21. [Scheduled Jobs (Cron)](#21-scheduled-jobs-cron)
22. [Network / VPN / DNS](#22-network--vpn--dns)
23. [Quick Reference Cheat Sheet](#23-quick-reference-cheat-sheet)

---

## 1. Dev Server (localhost:3100)

### 1.1 Port 3100 Already In Use

- **Symptom:** `EADDRINUSE: address already in use :::3100`
- **Cause:** Previous `npm run dev` still running (crashed, orphaned, or in another terminal)
- **Fix:**
  ```bash
  npx kill-port 3100
  npm run dev
  ```
- **Alt fix (Windows):** Task Manager > find `node.exe` > End Task

### 1.2 Dev Server Crashes Silently

- **Symptom:** Browser shows "This site can't be reached" on localhost:3100. Terminal has no output or shows an unhandled rejection.
- **Cause:** Unhandled exception in server code, memory exhaustion, or file watcher crash
- **Fix:** Ctrl+C in terminal, then `npm run dev` again

### 1.3 Dev Server Hot Reload Stops Working

- **Symptom:** You save a file, nothing happens in the browser. No compile output in terminal.
- **Cause:** File watcher limit hit (too many files), `.next` cache corruption, or TypeScript error blocking the compiler
- **Fix:**
  ```bash
  # Kill and clean
  npx kill-port 3100
  rm -rf .next/
  npm run dev
  ```

### 1.4 Dev Server Extremely Slow (10+ second page loads)

- **Symptom:** Every page load takes 10-30 seconds. Terminal shows slow compilation.
- **Cause:** Ollama hogging CPU/RAM, too many browser tabs, or `.next` cache bloated
- **Fix:**
  - Close unnecessary browser tabs
  - If Ollama is running a big model, wait for it to finish or restart it
  - `rm -rf .next/ && npm run dev`

### 1.5 "Module Not Found" After Git Pull

- **Symptom:** `Module not found: Can't resolve '@/components/...'` or `Cannot find module '...'`
- **Cause:** New dependencies added by another contributor, or files moved/renamed
- **Fix:**
  ```bash
  npm install
  rm -rf .next/
  npm run dev
  ```

### 1.6 `node_modules` Corruption

- **Symptom:** Random errors like `Cannot read properties of undefined`, modules resolving to wrong versions, or phantom type errors
- **Cause:** Interrupted `npm install`, version conflicts, or Windows file locking
- **Fix:**
  ```bash
  rm -rf node_modules package-lock.json .next/
  npm install
  npm run dev
  ```

### 1.7 Windows File Locking Prevents Delete

- **Symptom:** `EPERM: operation not permitted` or `EBUSY: resource busy` when trying to delete `.next/` or `node_modules/`
- **Cause:** A Node.js process still has files locked
- **Fix:**
  - Close all terminals running Node
  - Close VS Code (it locks files via its TS server)
  - Task Manager > kill ALL `node.exe` processes
  - Then delete the folder and restart

---

## 2. Next.js Build System

### 2.1 `.next` Directory Corruption

- **Symptom:** `ENOTEMPTY: directory not empty`, `Cannot find module './<hash>.js'`, or blank/black pages
- **Cause:** Build interrupted mid-write, parallel builds (multi-agent), or PWA plugin conflict
- **Fix:**
  ```bash
  rm -rf .next/
  npm run dev          # for dev
  npx next build       # for production build
  ```

### 2.2 TypeScript Compilation Errors

- **Symptom:** `error TS2322: Type 'X' is not assignable to type 'Y'`
- **Cause:** Code change introduced a type mismatch, or `types/database.ts` is stale
- **Fix:**

  ```bash
  # Check what's wrong
  npx tsc --noEmit --skipLibCheck

  # If it's stale types:
  npm run supabase:types
  ```

### 2.3 `'use server'` Export Error

- **Symptom:** `Only async functions can be exported from a 'use server' file`
- **Cause:** You exported a `const`, `type`, or non-async function from a `'use server'` file
- **Fix:** Move the constant/type to a separate file (e.g., `lib/foo/constants.ts`)

### 2.4 Build Manifest Error

- **Symptom:** `ENOENT: no such file or directory, open '.next/build-manifest.json'`
- **Cause:** Partial build failure or concurrent build corruption
- **Fix:** `rm -rf .next/ && npx next build --no-lint`

### 2.5 Build Heap Out of Memory (PC)

- **Symptom:** `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`
- **Cause:** Very large build, too many open apps consuming RAM
- **Fix:**
  ```bash
  # Close other heavy apps, then:
  NODE_OPTIONS="--max-old-space-size=8192" npx next build --no-lint
  ```

### 2.6 PWA Build Double-Pass Failure

- **Symptom:** `ENOENT: Cannot write _ssgManifest.js` during build
- **Cause:** PWA plugin creates a second webpack pass that conflicts on Windows
- **Fix:** PWA is disabled by default. Don't set `ENABLE_PWA_BUILD=1` unless specifically needed. Normal builds skip PWA.

### 2.7 Build Takes Forever (5+ minutes on PC)

- **Symptom:** `npx next build` hangs for a very long time
- **Cause:** Ollama model loaded in VRAM eating resources, or many dynamic routes
- **Fix:**
  - Stop Ollama temporarily: close Ollama tray icon or `taskkill /IM ollama.exe /F`
  - Close Chrome tabs
  - Rebuild

---

## 3. Ollama / Local AI

### 3.1 Ollama Not Running

- **Symptom:** Dashboard badge shows "Offline" (red). AI features show "Start Ollama to use this feature."
- **Error:** `OllamaOfflineError: Ollama unreachable at http://localhost:11434: Connection refused`
- **Cause:** Ollama service not started, crashed, or computer rebooted
- **Fix (Windows):**
  - Open Ollama app (tray icon should appear), OR
  - Terminal: `ollama serve`
- **Fix (Pi):**
  ```bash
  ssh pi
  sudo systemctl start ollama
  ```

### 3.2 Ollama Running But Model Not Loaded

- **Symptom:** `OllamaOfflineError: Model "qwen3:8b" not found. Run: ollama pull qwen3:8b`
- **Cause:** Model was deleted, never pulled, or name doesn't match env var
- **Fix:**

  ```bash
  # Check what's installed
  ollama list

  # Pull what's needed
  ollama pull qwen3:8b
  ```

### 3.3 Ollama Timeout (Hangs for 60+ seconds)

- **Symptom:** AI action shows "Processing..." forever, then times out after 60s
- **Cause:** Model loading into memory (first request after restart), system overloaded, or context window exceeded
- **Fix:**
  - **First request after start:** Just wait 30-60s, it's loading the model into RAM/VRAM
  - **Persistent:** Kill and restart:

    ```bash
    # Windows
    taskkill /IM ollama.exe /F
    ollama serve

    # Pi
    ssh pi
    sudo systemctl restart ollama
    ```

### 3.4 Ollama Empty Response

- **Symptom:** `OllamaOfflineError: Ollama returned an empty response. The model may have run out of context.`
- **Cause:** Input too long (exceeded context window), model crashed mid-generation
- **Fix:** Retry with shorter input. If persistent, restart Ollama.

### 3.5 Ollama Invalid JSON Response

- **Symptom:** `OllamaOfflineError: Ollama response was not valid JSON. Raw: ...`
- **Cause:** Model generated malformed output, or OOM during generation
- **Fix:** Retry (transient). If persistent, restart Ollama or try a different model.

### 3.6 Ollama Validation Failed (Schema Mismatch)

- **Symptom:** `OllamaOfflineError: Ollama repair pass failed schema validation`
- **Cause:** Model output doesn't match the expected Zod schema, even after a repair pass
- **Fix:** Usually transient — retry. If it keeps happening, the prompt may need adjustment or the model may be too small for the task.

### 3.7 Ollama Consuming All CPU/RAM

- **Symptom:** Entire machine slows to a crawl. Fan running full speed. Other apps unresponsive.
- **Cause:** Large model (30B+) loaded, or multiple concurrent AI requests
- **Fix:**
  - Switch to smaller model: set `OLLAMA_MODEL=qwen3:8b` in `.env.local`
  - Kill Ollama: `taskkill /IM ollama.exe /F` (Windows) or `sudo systemctl stop ollama` (Pi)
  - Wait 30 seconds for memory to free up

### 3.8 Pi Ollama Unreachable From PC

- **Symptom:** `Error: Ollama unreachable at http://10.0.0.177:11434`
- **Cause:** Pi is off, Pi WiFi disconnected, wrong IP in env, firewall blocking
- **Fix:**

  ```bash
  # Check Pi is reachable
  ping 10.0.0.177

  # If unreachable: check Pi is on, WiFi connected
  # If reachable but Ollama isn't:
  ssh pi
  sudo systemctl restart ollama
  curl http://localhost:11434/api/tags   # verify on Pi
  ```

### 3.9 Pi Watchdog Circuit Breaker Tripped

- **Symptom:** Ollama stays offline on Pi even though watchdog should restart it
- **Cause:** Watchdog restarted too many times (3+ in an hour), circuit breaker blocks further restarts
- **Fix:**
  ```bash
  ssh pi
  rm /tmp/chefflow-watchdog-restarts    # reset counter
  sudo systemctl restart ollama
  ```

### 3.10 Ollama Wake Functions Fail

- **Symptom:** Calling `wakePcOllama()` or `wakePiOllama()` doesn't bring Ollama online
- **Cause:** SSH key not configured (Pi), service name wrong (Windows), or process already running but stuck
- **Fix:**
  - Kill the stuck process first, THEN wake:

    ```bash
    # PC
    taskkill /IM ollama.exe /F
    ollama serve

    # Pi
    ssh pi
    sudo systemctl stop ollama
    sudo systemctl start ollama
    ```

---

## 4. Raspberry Pi (Beta Server)

### 4.1 SSH Connection Fails

- **Symptom:** `ssh: Could not resolve hostname pi` or `Connection refused`
- **Cause:** Pi is off, WiFi disconnected, SSH not running, or `~/.ssh/config` not set up
- **Fix:**

  ```bash
  # Try direct IP
  ping 10.0.0.177

  # If ping fails: physically check Pi is on and WiFi connected
  # If ping works but SSH fails:
  ssh -i ~/.ssh/id_ed25519 davidferra@10.0.0.177
  ```

### 4.2 Pi Low Disk Space

- **Symptom:** Build fails with `ENOSPC: no space left on device`, or services crash randomly
- **Fix:**
  ```bash
  ssh pi
  df -h                                          # check usage
  rm -rf ~/apps/chefflow-beta/.next              # delete old build
  rm -rf ~/apps/chefflow-beta/.next.backup       # delete backup
  npm cache clean --force                        # clear npm cache
  sudo apt-get autoremove && sudo apt-get autoclean
  ```

### 4.3 Pi Build Fails (Out of Memory)

- **Symptom:** `JavaScript heap out of memory` or `ENOMEM` during `deploy-beta.sh`
- **Cause:** Only 8 GB RAM, Ollama still running, not enough swap
- **Fix:**

  ```bash
  ssh pi

  # Stop Ollama (frees ~5 GB)
  sudo systemctl stop ollama

  # Verify swap exists (need 2 GB+)
  free -h

  # If no swap:
  sudo fallocate -l 2G /var/swap
  sudo chmod 600 /var/swap
  sudo mkswap /var/swap
  sudo swapon /var/swap

  # Build with heap limit
  cd ~/apps/chefflow-beta
  NODE_OPTIONS="--max-old-space-size=4096" npx next build --no-lint

  # Restart Ollama after build
  sudo systemctl start ollama
  ```

### 4.4 PM2 Process Died

- **Symptom:** `beta.cheflowhq.com` returns 502/503 or "Connection refused"
- **Fix:**
  ```bash
  ssh pi
  pm2 status                    # check if chefflow-beta is "stopped" or "errored"
  pm2 restart chefflow-beta     # restart it
  pm2 logs chefflow-beta        # check what happened
  ```

### 4.5 PM2 Process Won't Start

- **Symptom:** `pm2 restart` exits immediately, status shows "errored"
- **Cause:** Missing `.env.local`, port conflict, or corrupt `.next` build
- **Fix:**

  ```bash
  ssh pi
  pm2 logs chefflow-beta --lines 50     # read the actual error

  # Common fixes:
  # 1. Check env exists:
  cat ~/apps/chefflow-beta/.env.local

  # 2. Kill stale node processes:
  killall node
  pm2 restart chefflow-beta

  # 3. Rebuild:
  cd ~/apps/chefflow-beta
  rm -rf .next
  NODE_OPTIONS="--max-old-space-size=4096" npx next build --no-lint
  pm2 restart chefflow-beta
  ```

### 4.6 Deploy Script Fails

- **Symptom:** `bash scripts/deploy-beta.sh` stops at some step
- **Cause:** SSH failure, build failure, PM2 failure, or health check failure
- **Fix:** Read the error output — the script prints which step failed. Then fix that specific step (see sections above). Common ones:
  - Step 1 (SSH): Pi unreachable → see 4.1
  - Step 3 (npm ci): Disk full → see 4.2
  - Step 5 (build): OOM → see 4.3
  - Step 6 (PM2): Process error → see 4.5
  - Step 7 (health check): App didn't start → see 4.5

### 4.7 Rollback Fails (No Backup)

- **Symptom:** `bash scripts/rollback-beta.sh` says `ERROR: No backup found at .next.backup`
- **Cause:** First deploy ever, or previous deploy failed before creating backup
- **Fix:**
  ```bash
  ssh pi
  cd ~/apps/chefflow-beta
  git fetch origin && git reset --hard origin/main
  npm ci --production=false
  NODE_OPTIONS="--max-old-space-size=4096" npx next build --no-lint
  pm2 restart chefflow-beta
  ```

### 4.8 Pi Thermal Throttling

- **Symptom:** Everything on Pi runs extremely slowly. Ollama takes minutes per response.
- **Fix:**
  ```bash
  ssh pi
  vcgencmd measure_temp     # should be < 80C
  ```

  - If hot: improve airflow, add a fan, or reduce workload
  - Stop heavy processes until it cools down

### 4.9 Ollama Doesn't Restart After Build

- **Symptom:** Deploy succeeded but AI features on beta are offline
- **Cause:** `deploy-beta.sh` stopped Ollama for the build but didn't restart it (script error or manual interrupt)
- **Fix:**
  ```bash
  ssh pi
  sudo systemctl start ollama
  curl http://localhost:11434/api/tags    # verify
  ```

---

## 5. Cloudflare Tunnel (Beta URL)

### 5.1 `beta.cheflowhq.com` Unreachable

- **Symptom:** Browser shows `ERR_TUNNEL_CONNECTION_FAILED` or "site can't be reached"
- **Cause:** Cloudflare tunnel not running, or Pi process not serving
- **Fix:**
  - First check if the app itself is running on Pi (see 4.4)
  - If app is running but tunnel isn't:
    ```bash
    # On Pi:
    ssh pi
    cloudflared tunnel run chefflow-beta
    ```
  - Or from PC:
    ```bash
    npm run beta:named    # starts tunnel from PC
    ```

### 5.2 Tunnel Credentials Expired

- **Symptom:** `Error: Failed to dial tunnel, server did not accept request`
- **Fix:**
  ```bash
  cloudflared tunnel login          # re-authenticate
  cloudflared tunnel list           # verify tunnel exists
  npm run beta:named                # retry
  ```

### 5.3 Quick Tunnel URL Changed

- **Symptom:** Previous quick tunnel URL no longer works
- **Cause:** Quick tunnels (`npm run beta:quick`) create random URLs that expire after ~1 hour
- **Fix:** Run `npm run beta:quick` again for a new URL. Or use `npm run beta:named` for the permanent `beta.cheflowhq.com` URL.

### 5.4 Tunnel Points to Wrong Port

- **Symptom:** `beta.cheflowhq.com` shows wrong content or a blank page
- **Cause:** `.cloudflared/config.yml` has wrong `service: http://localhost:XXXX`
- **Fix:** Edit `.cloudflared/config.yml` — service should be `http://localhost:3100`

---

## 6. Vercel (Production)

### 6.1 Accidental Deploy to Production

- **Symptom:** Code pushed to `main` triggered a Vercel build
- **Cause:** Someone merged to `main` without approval
- **Fix:**
  - Go to Vercel dashboard → Deployments → find the bad deploy → "Redeploy" the previous good deploy
  - Or revert the commit on `main` and push

### 6.2 Vercel Build Fails

- **Symptom:** Vercel dashboard shows "Build failed" with TypeScript or Next.js errors
- **Cause:** Code has type errors, missing env vars on Vercel, or dependency issues
- **Fix:**
  - Run locally first: `npx tsc --noEmit --skipLibCheck && npx next build --no-lint`
  - Fix errors locally, push to `main` again
  - Check Vercel env vars match `.env.local`

### 6.3 Vercel Missing Environment Variables

- **Symptom:** App deploys but features don't work (Stripe, email, auth all broken)
- **Cause:** Env vars set locally but not on Vercel
- **Fix:** Vercel dashboard → Settings → Environment Variables → add all required vars

### 6.4 Vercel Edge Function Timeout

- **Symptom:** API route returns 504 Gateway Timeout
- **Cause:** Server action takes too long (>10s on hobby plan, >60s on pro)
- **Fix:** Optimize the slow server action, or move heavy work to background job

### 6.5 Feature Branch Accidentally Triggered Build

- **Symptom:** Pushing a feature branch caused a Vercel deployment
- **Cause:** `vercel.json` `ignoreCommand` not working correctly
- **Fix:** This shouldn't happen — `vercel.json` has `ignoreCommand` set to only build `main`. Check `vercel.json` is correct.

---

## 7. Supabase (Database + Auth)

### 7.1 Supabase Unreachable

- **Symptom:** Entire app shows errors on every page. `/api/health` returns `database: unreachable`
- **Cause:** Internet down, Supabase outage, VPN blocking, or wrong credentials
- **Fix:**
  - Check internet: `ping 8.8.8.8`
  - Check Supabase status: https://status.supabase.com
  - Check VPN: temporarily disable NordVPN
  - Verify `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL`

### 7.2 RLS (Row-Level Security) Blocks Valid Access

- **Symptom:** Query returns empty results even though data exists. Or: `permission denied for table X`
- **Cause:** RLS policy doesn't cover the user's role or tenant_id
- **Fix:**
  - Check `user_roles` table for the user: do they have the right role + entity_id?
  - Check RLS policies in Supabase dashboard
  - For debugging: temporarily use admin client to verify data exists

### 7.3 Migration Won't Apply

- **Symptom:** `supabase db push` fails with SQL error
- **Cause:** Migration has syntax error, references nonexistent table/column, or timestamp collision
- **Fix:**
  - Read the error message — it tells you the exact SQL issue
  - Fix the migration file
  - If timestamp collision: rename the file with a higher timestamp
  - **Always backup first:** `supabase db dump --linked > backup-$(date +%Y%m%d).sql`

### 7.4 `types/database.ts` Stale

- **Symptom:** TypeScript errors about missing columns or wrong types on database tables
- **Cause:** Schema was changed but types weren't regenerated
- **Fix:**
  ```bash
  npm run supabase:types
  ```

### 7.5 Connection Pool Exhausted

- **Symptom:** Queries hang or fail with "too many connections"
- **Cause:** Connection leak, too many concurrent requests
- **Fix:** Restart the dev server (kills all connections). Check Supabase dashboard for connection count.

### 7.6 Supabase Circuit Breaker OPEN

- **Symptom:** `/api/health` shows `circuit_breakers: { "supabase": "open" }`
- **Cause:** 10+ consecutive Supabase failures
- **Fix:** Wait 10 seconds (auto-resets). If Supabase is actually down, wait for it to come back.

---

## 8. Authentication & Sessions

### 8.1 User Stuck in Login Redirect Loop

- **Symptom:** Page keeps bouncing between `/auth/login` and the app
- **Cause:** Corrupted session cookie, token mismatch
- **Fix:**
  - Clear all cookies for the site (DevTools → Application → Cookies → Clear)
  - Clear localStorage: `localStorage.clear()` in console
  - Log in fresh

### 8.2 Session Expired Mid-Use

- **Symptom:** User is suddenly redirected to login, or gets 401 on an action
- **Cause:** Session token expired (default 24h), user was idle too long
- **Fix:** Log in again. This is normal behavior.

### 8.3 User Has Wrong Role

- **Symptom:** Chef sees client pages, or client sees chef pages, or user gets "Unauthorized"
- **Cause:** `user_roles` table has wrong role, or missing entry entirely
- **Fix:** Check and fix `user_roles` table directly in Supabase dashboard:
  ```sql
  SELECT * FROM user_roles WHERE auth_user_id = '<user-id>';
  -- Fix: UPDATE or INSERT the correct role
  ```

### 8.4 Role Cache Cookie Stale

- **Symptom:** User changed role but old role still shows
- **Cause:** `chefflow-role-cache` cookie not expired yet (5-minute TTL)
- **Fix:** Clear cookies, or wait 5 minutes

### 8.5 OAuth Token Revoked (Google)

- **Symptom:** Gmail sync stops working, Google Calendar disconnects
- **Cause:** User revoked access in Google Account settings, or token expired
- **Fix:** Settings → Google connections → "Reconnect"

### 8.6 Admin Access Not Working

- **Symptom:** `/admin` shows "Unauthorized" for the admin user
- **Cause:** Email not in admin allowlist, or `ADMIN_EMAILS` env var not set
- **Fix:** Check `.env.local` has `ADMIN_EMAILS=your@email.com`

---

## 9. Stripe (Payments)

### 9.1 Payment Processing Fails

- **Symptom:** User clicks "Pay" and gets an error. Or: `CircuitOpenError: Stripe circuit breaker OPEN`
- **Cause:** Stripe API down, card declined, or 3+ consecutive failures tripped circuit breaker
- **Fix:**
  - Check Stripe dashboard for the specific error
  - If circuit breaker: wait 30 seconds for auto-reset, then retry
  - If card declined: user needs to try a different card
  - If Stripe is down: check https://status.stripe.com

### 9.2 Webhook Not Processing

- **Symptom:** Payment went through on Stripe, but ChefFlow doesn't show it. Ledger not updated.
- **Cause:** Webhook signature mismatch, endpoint unreachable during payment, or code error
- **Fix:**
  - Check Stripe dashboard → Webhooks → Recent events → look for failures
  - Check `dead_letter_queue` table for failed webhook jobs
  - Manually reconcile: add the ledger entry from the webhook data
  - Verify `STRIPE_WEBHOOK_SECRET` is correct in `.env.local`

### 9.3 Stripe Connect Account Not Syncing

- **Symptom:** Chef's payout status not updating (stuck on "pending verification")
- **Cause:** `account.updated` webhook failed
- **Fix:** Check Stripe Connect dashboard, trigger a manual sync, or wait for next webhook

### 9.4 Missing Stripe Keys

- **Symptom:** Payment form doesn't load at all. Console shows Stripe initialization error.
- **Fix:** Verify `.env.local` has:
  ```
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
  STRIPE_SECRET_KEY=sk_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```

---

## 10. Resend (Email)

### 10.1 Emails Not Sending

- **Symptom:** Confirmation emails, notifications, invoices don't arrive
- **Cause:** Resend API down, rate limited, or API key invalid
- **Fix:**
  - Check Resend dashboard for failed sends
  - If circuit breaker OPEN: wait 60 seconds
  - Verify `RESEND_API_KEY` is set in `.env.local`
  - **Important:** Email is non-blocking — the underlying operation (event transition, payment, etc.) still succeeded

### 10.2 Emails Going to Spam

- **Symptom:** Emails arrive but land in spam folder
- **Cause:** Domain verification incomplete, or sender reputation issue
- **Fix:** Check Resend dashboard → Domain settings → verify DNS records (SPF, DKIM, DMARC)

### 10.3 Resend Webhook Fails

- **Symptom:** Open/click tracking not updating
- **Cause:** `svix-signature` header mismatch
- **Fix:** Verify Resend webhook signing secret matches what the app expects

---

## 11. Gmail Sync

### 11.1 Gmail Sync Not Running

- **Symptom:** New emails don't appear in ChefFlow messaging
- **Cause:** OAuth token expired, Gmail API not enabled, or cron job not triggering
- **Fix:**
  - User: Settings → Gmail → Reconnect (re-authorize)
  - Admin: Check Google Cloud Console → APIs → Gmail API is enabled
  - Check cron: Vercel dashboard → Cron Jobs → `/api/gmail/sync`

### 11.2 Gmail Token Expired

- **Symptom:** `Error: invalid_grant` in logs
- **Fix:** User must re-connect Gmail in Settings (generates new refresh token)

### 11.3 Gmail Rate Limited

- **Symptom:** Sync partially works, some emails not fetched
- **Cause:** Gmail API has daily quota limits
- **Fix:** Wait 24 hours for quota reset, or request quota increase in Google Cloud Console

---

## 12. Grocery Pricing APIs

### 12.1 Spoonacular Fails

- **Symptom:** Ingredient prices missing in grocery quote
- **Cause:** API key invalid, rate limited, or service down
- **Fix:** Check `SPOONACULAR_API_KEY` in `.env.local`. Wait 2 minutes if circuit breaker tripped.

### 12.2 Kroger Fails

- **Symptom:** Kroger prices missing
- **Fix:** Verify `KROGER_CLIENT_ID` and `KROGER_CLIENT_SECRET`. Wait 2 minutes for circuit reset.

### 12.3 MealMe Fails

- **Symptom:** Local store prices missing
- **Fix:** Verify `MEALME_API_KEY`. Wait 2 minutes for circuit reset.

### 12.4 Instacart Link Generation Fails

- **Symptom:** "Add to Instacart" button doesn't work
- **Fix:** Verify `INSTACART_API_KEY`. Note: Instacart provides cart links only, not pricing.

### 12.5 All Pricing Sources Fail

- **Symptom:** Grocery quote shows "Unable to fetch pricing" for all ingredients
- **Cause:** All circuit breakers tripped, or network issues
- **Fix:**
  - Wait 2 minutes for circuit breakers to reset
  - Check internet connectivity
  - Fallback: user can manually enter prices

---

## 13. Google Maps

### 13.1 Map Not Rendering

- **Symptom:** Map component shows blank/gray area
- **Fix:** Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set and Maps JavaScript API is enabled in Google Cloud Console

### 13.2 Location Autocomplete Not Working

- **Symptom:** Address input doesn't suggest locations
- **Fix:** Verify Places API is enabled in Google Cloud Console. Check API quota.

---

## 14. Circuit Breakers (All Services)

The app uses circuit breakers to prevent cascading failures. Here are all of them:

| Service         | Failure Threshold | Reset Time | What Happens When Open         |
| --------------- | ----------------- | ---------- | ------------------------------ |
| **Stripe**      | 3 failures        | 30 seconds | Payments fail fast             |
| **Resend**      | 5 failures        | 60 seconds | Emails skip silently           |
| **Gemini**      | 5 failures        | 60 seconds | Non-private AI fails           |
| **MealMe**      | 5 failures        | 2 minutes  | MealMe prices unavailable      |
| **Kroger**      | 5 failures        | 2 minutes  | Kroger prices unavailable      |
| **Spoonacular** | 5 failures        | 2 minutes  | Spoonacular prices unavailable |
| **Google Maps** | 5 failures        | 60 seconds | Maps features fail             |
| **Supabase**    | 10 failures       | 10 seconds | Everything fails               |

### How to check circuit breaker status:

- `GET /api/health` → response includes `circuit_breakers` object
- Console logs: `[CircuitBreaker] stripe transitioned to OPEN`

### How they recover:

1. OPEN (all requests fail fast) → wait for reset timeout
2. HALF_OPEN (one test request allowed) → if succeeds → CLOSED (normal)
3. If test request fails → back to OPEN

### Manual reset:

Circuit breakers are in-memory — restarting the dev server/PM2 process resets all of them to CLOSED.

---

## 15. PWA / Service Worker

### 15.1 Stale Content After Deploy

- **Symptom:** Old CSS/JS loads, new features don't appear
- **Fix:** Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### 15.2 Stuck Service Worker

- **Symptom:** App behaves weirdly, shows mixed old/new content
- **Fix:**
  - DevTools → Application → Service Workers → "Unregister"
  - DevTools → Application → Storage → "Clear all data"
  - Refresh

### 15.3 App Won't Install as PWA

- **Symptom:** "Install" button doesn't appear in browser
- **Cause:** Must be on HTTPS (not localhost), manifest must be valid
- **Fix:** PWA install only works on production (HTTPS). Localhost can test service worker but not install prompt.

### 15.4 Offline Mode Data Not Syncing

- **Symptom:** Actions taken offline don't sync when back online
- **Fix:**
  - Check service worker is active
  - Clear storage and refresh
  - Data syncs automatically on reconnect — may take a few seconds

---

## 16. Supabase Realtime (WebSockets)

### 16.1 Live Updates Not Appearing

- **Symptom:** Chat messages, activity feed, or real-time data doesn't update without manual refresh
- **Cause:** WebSocket disconnected (network blip, VPN interference, or Supabase realtime issue)
- **Fix:**
  - Refresh the page (reconnects WebSocket)
  - Check VPN isn't blocking WebSocket connections
  - Check DevTools → Network → filter "ws" → should see active WebSocket to Supabase

### 16.2 "Connecting..." Forever

- **Symptom:** Real-time features show "Connecting..." and never connect
- **Fix:**
  - Check internet connectivity
  - Disable VPN temporarily
  - Check Supabase status page

---

## 17. Multi-Agent / Concurrent Work

### 17.1 TypeScript Compiler Lock

- **Symptom:** `tsc --noEmit` hangs forever, 100% CPU
- **Cause:** Multiple agents running `tsc` simultaneously
- **Fix:**
  ```bash
  # Kill all tsc processes
  taskkill /IM node.exe /F    # Windows (kills all Node, restart dev after)
  pkill -9 tsc                # Linux
  ```
- **Prevention:** In multi-agent mode, agents DON'T run tsc. Developer does one build after.

### 17.2 `.next` Corruption From Parallel Builds

- **Symptom:** Random build failures, webpack cache errors
- **Cause:** Multiple agents ran `next build` simultaneously
- **Fix:** `rm -rf .next/` and single clean build
- **Prevention:** In multi-agent mode, agents DON'T run next build.

### 17.3 Migration Timestamp Collision

- **Symptom:** Migration fails to apply, "duplicate key" error
- **Cause:** Two agents created migrations with the same timestamp
- **Fix:** Rename the conflicting file with a higher timestamp
- **Prevention:** Always `glob supabase/migrations/*.sql` before creating a new migration

### 17.4 Git Merge Conflicts

- **Symptom:** `git push` fails, merge conflict
- **Cause:** Multiple agents edited the same file
- **Fix:** `git pull`, resolve conflicts manually, commit and push

### 17.5 Port 3100 Conflict Between Agents

- **Symptom:** One agent's dev server works, another's fails with `EADDRINUSE`
- **Fix:** Only one dev server should run at a time. Kill with `npx kill-port 3100`.

---

## 18. Git / GitHub

### 18.1 Push to GitHub Fails

- **Symptom:** `git push` returns authentication error or network error
- **Fix:**

  ```bash
  # Check SSH key
  ssh -T git@github.com

  # If auth fails: check SSH key is added to GitHub
  # If network fails: check internet, VPN
  ```

### 18.2 Push to Wrong Branch

- **Symptom:** Accidentally pushed to `main`
- **Fix:**
  - If Vercel deploy triggered: go to Vercel dashboard, redeploy previous version
  - Revert commit: `git revert HEAD && git push origin main`
  - Then cherry-pick onto feature branch

### 18.3 Detached HEAD

- **Symptom:** `git status` shows "HEAD detached at..." — commits go nowhere
- **Fix:**
  ```bash
  git checkout -b recovery-branch     # save current work
  git checkout feature/your-branch    # go back to your branch
  git merge recovery-branch           # bring the work over
  ```

### 18.4 Uncommitted Work Lost

- **Symptom:** `git stash` or `git checkout .` wiped changes
- **Fix:**
  - `git stash list` → find and `git stash pop`
  - `git reflog` → find the commit hash → `git checkout <hash>`
  - If truly gone: check if VS Code has local history (right-click file → Open Timeline)

---

## 19. Environment Variables

### 19.1 The Complete Required List

Missing any of these causes silent failures in specific features:

**Core (app won't start without these):**

```
NEXT_PUBLIC_SUPABASE_URL=https://luefkpakzvxcsqroxyhz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Auth:**

```
NEXT_PUBLIC_APP_URL=http://localhost:3100
```

**Payments:**

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Email:**

```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@cheflowhq.com
```

**AI (local):**

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
```

**Gmail:**

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**Maps:**

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

**Grocery:**

```
SPOONACULAR_API_KEY=...
KROGER_CLIENT_ID=...
KROGER_CLIENT_SECRET=...
MEALME_API_KEY=...
INSTACART_API_KEY=...
```

**Cron:**

```
CRON_SECRET=...
```

**Admin:**

```
ADMIN_EMAILS=your@email.com
```

**Optional (app works without, features degraded):**

```
GEMINI_API_KEY=...
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### 19.2 `NEXT_PUBLIC_` Variables Not Working Client-Side

- **Symptom:** `undefined` in browser console for a public env var
- **Cause:** Must be set at BUILD time, not just runtime
- **Fix:** After changing a `NEXT_PUBLIC_` var, you must rebuild: `npm run dev` (restart) or `npx next build`

### 19.3 API Key Expired or Rotated

- **Symptom:** Feature returns 401 Unauthorized from external API
- **Fix:** Check the provider's dashboard, generate a new key, update `.env.local`, restart dev server

---

## 20. Data Integrity

### 20.1 Destructive Migration Ran Without Backup

- **Symptom:** Data is gone (table dropped, column removed, rows deleted)
- **Fix:**
  - Check Supabase dashboard → Backups → restore if available
  - If no backup: data is lost. This is why backups are mandatory.
  - **Prevention:** Always run `supabase db dump --linked > backup-$(date +%Y%m%d).sql` before pushing migrations

### 20.2 Ledger Entry Missing (Financial Mismatch)

- **Symptom:** Dashboard totals don't add up, revenue wrong
- **Fix:**
  - Query ledger: `SELECT * FROM ledger_entries WHERE event_id = '...'`
  - Find what's missing
  - Append a correcting entry (never edit existing entries — they're immutable)

### 20.3 Foreign Key Violation

- **Symptom:** `violates foreign key constraint` on insert/update
- **Fix:** Ensure the parent record exists first. Check the FK relationship.

### 20.4 Duplicate Key Violation

- **Symptom:** `violates unique constraint` on insert
- **Fix:** Check if record already exists. Use upsert instead of insert if appropriate.

### 20.5 Orphaned Records

- **Symptom:** UI shows references to deleted items, broken links
- **Fix:** Query for orphans: `SELECT * FROM child_table WHERE parent_id NOT IN (SELECT id FROM parent_table)`

---

## 21. Scheduled Jobs (Cron)

### 21.1 All Cron Jobs Return 401

- **Symptom:** `/api/gmail/sync`, `/api/scheduled/automations`, etc. all fail
- **Cause:** `CRON_SECRET` mismatch between local and Vercel
- **Fix:**

  ```bash
  # Generate new secret
  openssl rand -hex 32

  # Add to .env.local AND Vercel env vars
  ```

### 21.2 Cron Jobs Not Running on Beta

- **Symptom:** Scheduled tasks don't execute on beta server
- **Cause:** By design — cron jobs only run on production (Vercel, `main` branch)
- **Fix:** This is intentional. Feature branches and beta don't run crons.

### 21.3 Dead Letter Queue Building Up

- **Symptom:** `dead_letter_queue` table has entries piling up
- **Fix:**

  ```sql
  -- Check what's failing
  SELECT * FROM dead_letter_queue ORDER BY last_failed_at DESC LIMIT 20;

  -- Fix the root cause (API, DB, config)
  -- Then manually re-queue or mark as resolved
  ```

---

## 22. Network / VPN / DNS

### 22.1 NordVPN Blocking Supabase

- **Symptom:** App can't reach Supabase, but internet otherwise works
- **Fix:** Temporarily disconnect NordVPN, test, then reconnect with split tunneling

### 22.2 NordVPN Blocking Pi

- **Symptom:** Can't SSH to Pi, can't reach Pi Ollama
- **Cause:** VPN routes private network traffic (10.x.x.x) through the VPN
- **Fix:** Add Pi's IP to VPN split tunneling whitelist, or disconnect VPN

### 22.3 DNS Resolution Failure

- **Symptom:** `getaddrinfo ENOTFOUND` for any service
- **Fix:**

  ```bash
  # Flush DNS
  ipconfig /flushdns    # Windows

  # Try alternate DNS
  # Change adapter DNS to 1.1.1.1 (Cloudflare) or 8.8.8.8 (Google)
  ```

### 22.4 WiFi Drops During Deploy

- **Symptom:** `deploy-beta.sh` hangs or fails mid-transfer
- **Cause:** WiFi dropped between PC and Pi
- **Fix:** Wait for WiFi to reconnect, then re-run `bash scripts/deploy-beta.sh`

---

## 23. Quick Reference Cheat Sheet

**Top 25 "Go Restart X" fixes, in order of how often they happen:**

| #   | Problem                | Fix                                                             |
| --- | ---------------------- | --------------------------------------------------------------- |
| 1   | Dev server crashed     | `npx kill-port 3100 && npm run dev`                             |
| 2   | `.next` corrupted      | `rm -rf .next/ && npm run dev`                                  |
| 3   | Ollama offline (PC)    | Open Ollama app or `ollama serve`                               |
| 4   | Ollama offline (Pi)    | `ssh pi` → `sudo systemctl restart ollama`                      |
| 5   | Type errors            | `npm run supabase:types` then `npx tsc --noEmit --skipLibCheck` |
| 6   | Missing node_modules   | `npm install`                                                   |
| 7   | Corrupted node_modules | `rm -rf node_modules package-lock.json .next/ && npm install`   |
| 8   | PM2 died (beta)        | `ssh pi` → `pm2 restart chefflow-beta`                          |
| 9   | Pi build OOM           | `ssh pi` → stop Ollama → build with 4GB heap → restart Ollama   |
| 10  | Session expired        | Log out, log back in                                            |
| 11  | Circuit breaker OPEN   | Wait 30-120 seconds (auto-resets)                               |
| 12  | Email not sending      | Check `RESEND_API_KEY`, wait 60s for circuit reset              |
| 13  | Stripe payment fails   | Check Stripe dashboard, wait 30s for circuit reset              |
| 14  | Model not found        | `ollama pull qwen3:8b`                                          |
| 15  | VPN blocking things    | Disconnect NordVPN temporarily                                  |
| 16  | Gmail sync broken      | Settings → Gmail → Reconnect                                    |
| 17  | Service worker stale   | `Ctrl+Shift+R` (hard refresh)                                   |
| 18  | Pi unreachable         | Check Pi is on, WiFi connected, `ping 10.0.0.177`               |
| 19  | Pi low disk            | `ssh pi` → clean `.next`, `.next.backup`, npm cache             |
| 20  | Webhook missed         | Check provider dashboard, manually reconcile data               |
| 21  | Cron jobs 401          | Regenerate `CRON_SECRET`, update in `.env.local` + Vercel       |
| 22  | Port conflict          | `npx kill-port 3100`                                            |
| 23  | Git push fails         | `ssh -T git@github.com` (check SSH key)                         |
| 24  | Database types stale   | `npm run supabase:types`                                        |
| 25  | Windows file lock      | Kill all `node.exe` in Task Manager, then retry                 |

---

_Generated 2026-02-23. Update this doc when new failure modes are discovered._
