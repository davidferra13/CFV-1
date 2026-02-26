# PWA — Installable App Support

## What Changed

ChefFlow can now be "installed" as an app on phones, tablets, and desktops — no app store required.

## Why

Users (chefs and clients) need a fast, native-feeling way to access ChefFlow without always typing a URL. A Progressive Web App (PWA) lets them tap "Add to Home Screen" on their phone or "Install" in Chrome on desktop, giving them an app icon that launches ChefFlow in its own window (no browser bar).

## Files Created / Modified

| File                             | Purpose                                                                    |
| -------------------------------- | -------------------------------------------------------------------------- |
| `public/manifest.json`           | PWA manifest — tells browsers the app name, theme, icons, and display mode |
| `public/icon-192.svg`            | App icon (192px, regular)                                                  |
| `public/icon-512.svg`            | App icon (512px, regular)                                                  |
| `public/icon-maskable-192.svg`   | Maskable icon (192px, extra padding for Android adaptive icons)            |
| `public/icon-maskable-512.svg`   | Maskable icon (512px)                                                      |
| `scripts/generate-pwa-icons.cjs` | Script to regenerate icons if branding changes                             |
| `app/layout.tsx`                 | Added `manifest`, `appleWebApp`, `apple` icons, `theme-color` meta tag     |

## How It Works

1. **manifest.json** tells the browser: "This is an installable app called ChefFlow, with these icons, this theme color, and it should open in standalone mode (no browser chrome)."
2. **Next.js metadata** in `layout.tsx` links the manifest and adds Apple-specific PWA tags so iOS Safari also supports install.
3. **theme-color** makes the browser's address bar / status bar match ChefFlow's dark theme (#111827).

## How Users Install It

### On iPhone/iPad (Safari)

1. Open ChefFlow in Safari
2. Tap the Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Tap "Add"

### On Android (Chrome)

1. Open ChefFlow in Chrome
2. Chrome shows an "Install" banner automatically, or tap the three-dot menu → "Install app"

### On Desktop (Chrome/Edge)

1. Open ChefFlow in Chrome or Edge
2. Click the install icon in the address bar (or three-dot menu → "Install ChefFlow")

## What This Does NOT Include (Yet)

- **Service Worker / Offline Support** — The app requires internet. Offline caching can be added later with `next-pwa` if needed.
- **Push Notifications** — Possible future addition for event reminders, new inquiries, etc.
- **PNG Icons** — Currently using SVG icons which work in modern browsers. For broader compatibility, run the icon generator script with `sharp` to produce PNGs.

## Architecture Connection

This is purely a presentation-layer addition. No business logic, database, or server actions were touched. The manifest and meta tags are static assets served by Next.js. When deployed to Vercel, they're served from the CDN with proper caching headers automatically.

## Decision: PWA over Native App

| Approach              | Pros                                                                       | Cons                                                            |
| --------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **PWA (chosen)**      | Zero friction install, single codebase, instant updates, no app store fees | No push notifications on older iOS, limited offline             |
| Native (React Native) | Full device APIs, app store presence                                       | Separate codebase, app store review process, 15-30% payment cut |
| Electron              | Desktop app feel                                                           | Desktop only, large bundle, overkill for a web-first tool       |

PWA is the right choice for a SaaS tool like ChefFlow where users need quick access but don't need deep device integration.
