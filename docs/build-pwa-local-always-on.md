# ChefFlow — Native App Experience: PWA, Local Network & Auto-Start

**Feature:** ChefFlow installable as a native-feeling app on phone, tablet, and computer, accessible from any device on home WiFi, always running, and sessions that never expire.

---

## What Changed

### 1. Service Worker Registration (`components/pwa/sw-register.tsx` + `app/layout.tsx`)

A new `SwRegister` client component was added. It runs on every page load and tells the browser to activate the pre-built service worker (`/sw.js`).

**Before:** `sw.js` existed in `public/` but was never registered — no caching, no offline, no install prompt.

**After:** Browser picks up the service worker immediately. This unlocks:

- PWA "Add to Home Screen" / "Install" prompt on Chrome, Edge, Safari
- Offline fallback page when connection drops
- Workbox caching of all JS chunks, pages, images, fonts (faster loads)

The service worker was already built with full Workbox strategies:

- **NetworkFirst** for pages and API calls (fresh data when online, cached when offline)
- **StaleWhileRevalidate** for images and stylesheets
- **CacheFirst** for JS bundles (never change after build)

### 2. Dev Server Network Binding (`package.json`)

`"dev": "next dev -p 3100"` → `"dev": "next dev -p 3100 -H 0.0.0.0"`

**Before:** Server only responded to `localhost` — your phone and tablet couldn't reach it.

**After:** Server binds to all network interfaces. Any device on the same WiFi can reach ChefFlow at your computer's local IP.

### 3. Auto-Start Script (`start-chefflow.bat`)

A `.bat` file in the project root that launches ChefFlow with a clear console title and message. Designed to be added to Windows Startup so the server starts automatically on boot.

---

## How to Use This

### On Your Computer (Chrome or Edge)

1. Run ChefFlow: double-click `start-chefflow.bat` or run `npm run dev`
2. Open `http://localhost:3100` in Chrome or Edge
3. Look for the install icon in the address bar (looks like a monitor with a down arrow)
4. Click it → "Install" → ChefFlow opens in its own window with no browser UI
5. It's now in your Start Menu and taskbar like a real app

### On Your iPhone / iPad

1. Make sure your computer is running ChefFlow (step above)
2. Find your computer's local IP address:
   - Open Command Prompt (`Win+R` → type `cmd` → Enter)
   - Type `ipconfig` → look for "IPv4 Address" under your WiFi adapter
   - It will be something like `192.168.1.47` or `192.168.0.12`
3. On your iPhone, open **Safari** (must be Safari for iOS PWA install)
4. Go to `http://192.168.1.47:3100` (use your actual IP)
5. Tap the Share button (box with arrow) → "Add to Home Screen" → "Add"
6. ChefFlow icon appears on your home screen — tap it for a full-screen native feel

### On Android Phone / Tablet

1. Same steps as iPhone but use Chrome instead of Safari
2. Chrome will show a banner or address-bar install button
3. Tap "Add to Home Screen" or "Install"

### Making It Always Auto-Start (Windows)

To have ChefFlow start automatically every time your computer boots:

**Option A — Startup Folder (easiest):**

1. Press `Win+R`, type `shell:startup`, press Enter
2. Right-click inside that folder → "New" → "Shortcut"
3. Browse to `C:\Users\david\Documents\CFv1\start-chefflow.bat`
4. Name it "ChefFlow" → Finish
5. Now ChefFlow starts every time Windows starts

**Option B — Task Scheduler (runs even before you log in):**

1. Open Task Scheduler (`Win+R` → `taskschd.msc`)
2. Create Basic Task → Name: "ChefFlow Dev Server"
3. Trigger: "When the computer starts"
4. Action: Start a program → `C:\Users\david\Documents\CFv1\start-chefflow.bat`
5. Check "Run whether user is logged on or not" for true background operation

---

## Session Persistence (Never Sign In Again)

ChefFlow already handles this correctly:

- "Stay signed in" checkbox defaults to **checked** on the sign-in page
- Supabase issues a **60-day refresh token** that auto-renews on every page load
- The middleware refreshes your session silently in the background
- As long as you open ChefFlow at least once every 60 days, you'll never be prompted to sign in

**Result:** Sign in once per device, stay signed in forever.

---

## What Works Offline

Once you've visited a page while online, the service worker caches it. These work offline:

- Dashboard (cached after first visit)
- Event list and event detail pages (cached)
- All CSS, fonts, and UI components (always cached)
- Static images and icons

**What doesn't work offline:** Any real-time data from Supabase (API calls fail without internet). The app will show the last cached version of pages, or the offline fallback page for uncached routes.

---

## Architecture Connection

```
Windows Boot
    └─ start-chefflow.bat
         └─ npm run dev (binds 0.0.0.0:3100)
              └─ All devices on WiFi can reach http://[your-ip]:3100

Browser loads ChefFlow
    └─ app/layout.tsx renders SwRegister component
         └─ SwRegister.useEffect() → navigator.serviceWorker.register('/sw.js')
              └─ Workbox activates → caches all static assets + pages
                   └─ Install prompt appears in Chrome/Edge address bar
                        └─ User installs → standalone app window, home screen icon

Sign in (once per device)
    └─ rememberMe: true (default) → persistent cookie
         └─ middleware.ts refreshes token on every request
              └─ 60-day refresh window → never expires in normal use
```

---

## Future Upgrade: Full Offline + External Access

If you later want ChefFlow accessible **outside your home WiFi** (at a client's kitchen, on the road):

- **Deploy to Vercel** — always-on cloud, accessible anywhere, free tier available
- Combined with the PWA, this is the true "App Store" experience: install once, works everywhere, always fresh data

For **complete offline with local data** (no internet required at all):

- Would require running a local Supabase instance (Docker) — significant setup, complex to maintain
- Not recommended unless you need true air-gap capability
