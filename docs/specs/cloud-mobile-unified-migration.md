# Spec: Mobile App + PWA Activation

> **Status:** built (phases 1-3 complete, phase 4 blocked on macOS hardware)
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** medium (3-8 files)

## Timeline

| Event                  | Date       | Agent/Session      | Commit |
| ---------------------- | ---------- | ------------------ | ------ |
| Created                | 2026-04-06 | Planner (Opus 4.6) |        |
| Revised (self-hosted)  | 2026-04-06 | Planner (Opus 4.6) |        |
| Phase 1 verified       | 2026-04-06 | Planner (Opus 4.6) |        |
| Phase 2 built+verified | 2026-04-06 | Planner (Opus 4.6) |        |
| Phase 3 APK built      | 2026-04-06 | Planner (Opus 4.6) |        |

---

## Developer Notes

### Raw Signal

"Everything we ever do is hosted locally. Everything. The data, the database, any type of storage, anything. I'm not interested in using cloud services. I need everything to be free."

"My computer's on 24/7. I'm also probably moving this whole program to its own hardware that stays on 24/7, probably like a Mac mini. Something that specifically is just for hosting the website in every single way possible."

"This product is not a website or an application. It is both. Two interfaces to the same system."

### Developer Intent

- **Core goal:** ChefFlow installable as a native mobile app (Android/iOS) and PWA, while remaining 100% self-hosted on the developer's own hardware
- **Key constraints:** Zero cloud services. Zero monthly costs. No third-party providers beyond Cloudflare (domain/DNS/tunnel). Everything runs on owned hardware
- **Motivation:** Chefs need the app on their phones. The infrastructure already exists to serve it (Cloudflare Tunnel exposes `app.cheflowhq.com` globally). The missing piece is the mobile shell, not the backend
- **Success from the developer's perspective:** A chef installs ChefFlow on their phone. Same account, same data, same features. All served from the developer's hardware. $0 additional cost

---

## What This Does (Plain English)

After this work, ChefFlow is installable on Android and iOS phones as both a PWA (from the browser) and a native app (via Tauri). Both point at `app.cheflowhq.com`, which is already served from the developer's hardware via Cloudflare Tunnel. No new infrastructure. No cloud services. No monthly costs.

---

## Why It Matters

The app is 93% built. It's accessible at `app.cheflowhq.com`. But nobody can install it on their phone. The PWA is fully built but disabled. Tauri deps are installed but the project was never finished. These are the last steps between "works in a browser" and "works as a real app on your phone."

---

## Architecture: What Already Exists

```
Developer's PC (always on)
├── Next.js server (localhost:3000, production)
├── PostgreSQL (Docker, localhost:54322)
├── Ollama AI (localhost:11434)
├── Local file storage (./storage/)
└── Cloudflare Tunnel
     └── app.cheflowhq.com (HTTPS, globally reachable)

                    │
                    │ HTTPS
                    │
     ┌──────────────┼──────────────┐
     │              │              │
  Desktop       PWA (phone)    Tauri Native
  Browser       home screen    (Android/iOS)
     │              │              │
     └──────────────┴──────────────┘
           All hit app.cheflowhq.com
           Same server, same data, same auth
```

**Nothing needs to move.** The backend is already globally accessible. The database, storage, and AI are already reachable through the app's API routes via the tunnel. A phone hitting `app.cheflowhq.com` gets the full app. The only missing piece is the installable shell.

---

## What's Already Built (Verified 2026-04-06)

### PWA (100% built, disabled)

| Component             | Status           | Location                                                                                          |
| --------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| Manifest              | Complete         | `public/manifest.json` (name, icons, shortcuts, standalone display)                               |
| Service worker        | Production-grade | `public/sw.js` (caching, push notifications, version polling, offline fallback)                   |
| Icons (regular)       | Present          | `public/icon-192.png`, `public/icon-512.png`                                                      |
| Icons (maskable)      | Present          | `public/icon-maskable-192.png`, `public/icon-maskable-512.png`                                    |
| Apple touch icon      | Present          | `public/apple-touch-icon.png`                                                                     |
| Meta tags             | Complete         | `app/layout.tsx` (viewport, theme-color, apple-web-app-capable, manifest link)                    |
| Push notification API | Built            | `lib/push/vapid.ts`, `/api/push/subscribe`, `/api/push/unsubscribe`, `usePushSubscription()` hook |
| Push notification UI  | Built            | Settings form with toggle                                                                         |
| SW registration       | Built            | `SwRegister` component, production-only, handles updates                                          |

**Why it's disabled:** `@ducanh2912/next-pwa` wrapper corrupts build manifests on Windows. Documented in `next.config.js` lines 1-6. The manual `public/sw.js` works without the wrapper.

### Tauri (partially built, abandoned in worktree)

| Component           | Status               | Location                                                                                            |
| ------------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| Dependencies        | Installed            | `@tauri-apps/api@^2.10.1`, `@tauri-apps/cli@^2.10.0` in `package.json`                              |
| Scripts             | Defined              | `tauri:dev`, `tauri:build` in `package.json`                                                        |
| Desktop config      | Built (worktree)     | `.claude/worktrees/agent-a74b5586/src-tauri/tauri.conf.json`                                        |
| System tray         | Built (worktree)     | `.claude/worktrees/agent-a74b5586/src-tauri/src/tray.rs` (menu: Open, New Event, New Inquiry, Quit) |
| Hide-on-close       | Built (worktree)     | `.claude/worktrees/agent-a74b5586/src-tauri/src/main.rs` (minimize to tray instead of quit)         |
| Autostart plugin    | Built (worktree)     | Hardcoded to macOS launcher (needs platform fix)                                                    |
| Notification plugin | Built (worktree)     | Working                                                                                             |
| Android icons       | Generated (worktree) | All mipmap densities (mdpi through xxxhdpi)                                                         |
| iOS icons           | Generated (worktree) | All AppIcon sizes (20x20 through 512@2x)                                                            |
| Desktop icons       | Generated (worktree) | Windows (.ico), macOS (.icns), Linux (.png)                                                         |

**Why it's not on main:** Previous agent built it in a worktree, never merged. `src-tauri/` directory does not exist on the main branch.

---

## Phase Plan

### Phase 1: PWA Activation

**Effort:** Configuration and testing only. No code changes.

**Steps:**

1. Verify `public/sw.js` is served correctly at `app.cheflowhq.com/sw.js` (it should be, since it's a static file)
2. Verify `public/manifest.json` is served at `app.cheflowhq.com/manifest.json`
3. Test on Android (Chrome): navigate to `app.cheflowhq.com`, verify install prompt appears, install, verify standalone mode works
4. Test on iOS (Safari): navigate to `app.cheflowhq.com`, use Share > Add to Home Screen, verify standalone mode works
5. Generate VAPID keys for push notifications: `npx web-push generate-vapid-keys`
6. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL` in `.env.local`
7. Test push notifications on Android (iOS does not support PWA push)
8. Verify offline fallback page works when network is unavailable

**Files to modify:** None (possibly `.env.local` for VAPID keys only).

**PWA on iOS (known limitations, not bugs):**

- No install prompt (must use Share > Add to Home Screen manually)
- No push notifications (Apple restriction on PWAs)
- Limited background execution
- These are Safari limitations, not ChefFlow issues

**Decision: `ENABLE_PWA_BUILD=1` flag.** The manual `sw.js` in `public/` already works without the `@ducanh2912/next-pwa` wrapper. The flag enables the wrapper which has Windows build corruption issues. Recommendation: leave the flag off, use the manual service worker. It does the same job without the build risk.

---

### Phase 2: Tauri Desktop (Resurrect from Worktree)

**Effort:** Copy files, fix one platform detection issue, verify.

**Steps:**

1. Copy `src-tauri/` from `.claude/worktrees/agent-a74b5586/src-tauri/` to project root
2. Fix `main.rs`: change hardcoded `MacosLauncher::LaunchAgent` to platform-conditional compilation (macOS uses LaunchAgent, Windows uses registry, Linux uses XDG autostart)
3. Update `tauri.conf.json`: set `devUrl` to `http://localhost:3100` (dev) and production URL to `https://app.cheflowhq.com`
4. Add `src-tauri/target/` to `.gitignore` (Rust build artifacts)
5. Run `npm run tauri:dev` to verify desktop app launches and wraps the web UI
6. Verify: system tray works, hide-on-close works, tray menu navigation works (New Event, New Inquiry)
7. Run `npm run tauri:build` to produce a desktop installer

**Files to create (from worktree, not from scratch):**

| File                                  | Source        | Modifications                      |
| ------------------------------------- | ------------- | ---------------------------------- |
| `src-tauri/tauri.conf.json`           | Worktree copy | Update URLs                        |
| `src-tauri/Cargo.toml`                | Worktree copy | None                               |
| `src-tauri/src/main.rs`               | Worktree copy | Fix platform detection             |
| `src-tauri/src/tray.rs`               | Worktree copy | None                               |
| `src-tauri/build.rs`                  | Worktree copy | None                               |
| `src-tauri/capabilities/default.json` | Worktree copy | None                               |
| `src-tauri/icons/`                    | Worktree copy | None (all sizes already generated) |

**Files to modify:**

| File         | Change                  |
| ------------ | ----------------------- |
| `.gitignore` | Add `src-tauri/target/` |

---

### Phase 3: Tauri Android

**Prerequisite:** Phase 2 (desktop build must work first)

**Steps:**

1. Install Android SDK (Android Studio, SDK, NDK) on dev machine
2. Run `npx tauri android init` to generate Android project files inside `src-tauri/`
3. Configure signing key for APK
4. Android icons already exist in worktree (`src-tauri/icons/android/`)
5. Build: `npx tauri android build`
6. Test: install APK on physical Android device or emulator
7. Verify: app loads `app.cheflowhq.com` in native shell, auth works, all features accessible

**The app content is the same website.** Tauri on mobile wraps a WebView pointing at `app.cheflowhq.com`. No separate mobile backend. No offline database. No data sync layer. One server, one URL, native shell.

---

### Phase 4: Tauri iOS

**Prerequisite:** Phase 2 (desktop build), macOS machine

**Constraint:** iOS builds require macOS with Xcode. Developer is currently on Windows 11. Options:

- **Mac mini** (developer mentioned planning to get one as a dedicated server). This would solve both hosting and iOS builds
- **GitHub Actions macOS runner** (free tier: 2,000 minutes/month for public repos)
- **Defer** until Mac hardware is available

**Steps (when macOS is available):**

1. Run `npx tauri ios init` to generate iOS project files
2. Apple Developer account ($99/year) for App Store distribution, or test via Xcode sideloading (free)
3. Configure signing certificates
4. iOS icons already exist in worktree (`src-tauri/icons/ios/`)
5. Build: `npx tauri ios build`
6. Test on device or simulator

**This phase is blocked on hardware, not on code.**

---

## Mac Mini Server Strategy (Developer's Stated Plan)

The developer mentioned moving to dedicated always-on hardware (Mac mini). This solves multiple problems at once:

| Problem                          | How Mac mini solves it                                              |
| -------------------------------- | ------------------------------------------------------------------- |
| PC as single point of failure    | Dedicated server hardware, always on, single purpose                |
| iOS builds impossible on Windows | macOS runs Xcode natively                                           |
| Tauri builds for all platforms   | macOS can build for macOS, iOS, and (via cross-compilation) Android |
| Cloudflare Tunnel stability      | Dedicated machine = no accidental sleep/restart from daily use      |

**This is not a prerequisite for Phases 1-3.** PWA, desktop Tauri, and Android Tauri all work from the current Windows machine. The Mac mini unlocks iOS and provides better server reliability.

---

## Cost

| Item                    | Cost                                  |
| ----------------------- | ------------------------------------- |
| Phase 1 (PWA)           | $0                                    |
| Phase 2 (Tauri desktop) | $0                                    |
| Phase 3 (Tauri Android) | $0                                    |
| Phase 4 (Tauri iOS)     | $0 (sideload) or $99/year (App Store) |
| Mac mini (if purchased) | One-time hardware cost                |
| Cloudflare              | Already paying (domain only)          |
| **Total recurring**     | **$0**                                |

---

## Edge Cases

| Scenario                          | Behavior                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Developer's PC is off             | `app.cheflowhq.com` returns Cloudflare error page. PWA shows cached offline page. Tauri shows connection error |
| Slow connection on mobile         | PWA service worker serves cached assets. Dynamic content loads as network allows                               |
| Push notification when app closed | Android: delivered via system notification. iOS PWA: not supported (Apple limitation)                          |
| Tauri app update needed           | Desktop: auto-update via Tauri updater plugin. Mobile: new APK/IPA build                                       |

---

## Out of Scope

- Cloud database migration (not happening; database stays local)
- Cloud storage migration (not happening; storage stays local)
- Cloud hosting (not happening; Cloudflare Tunnel is the hosting layer)
- S3 or any third-party storage provider
- Any service with a monthly bill
- App Store submission process (separate from building the app)
- Offline-first data sync (app requires network; offline shows cached shell)

---

## Verification Steps

1. **PWA (Android):** Open Chrome on Android phone, navigate to `app.cheflowhq.com`, verify install prompt, install, open from home screen, sign in, create a test event, verify it persists
2. **PWA (iOS):** Open Safari on iPhone, navigate to `app.cheflowhq.com`, Share > Add to Home Screen, open from home screen, sign in, verify basic navigation
3. **Tauri Desktop:** Run `npm run tauri:dev`, verify window opens with full app, test tray menu, test hide-on-close
4. **Tauri Android:** Install APK, open, verify full app loads, sign in, navigate all six pillars
5. **Cross-surface sync:** Create an event on desktop browser, verify it appears on mobile PWA and Tauri app (same database, same session)

---

## Notes for Builder Agent

1. **Phase 1 is the highest-leverage move.** Zero code changes, zero cost, immediate mobile access. The PWA is already built. Just verify it works.

2. **Phase 2 is copy-paste from worktree + one fix.** Don't rebuild Tauri from scratch. The worktree at `.claude/worktrees/agent-a74b5586/src-tauri/` has everything including icons for all platforms.

3. **The backend doesn't change at all.** No storage rewrite. No database migration. No new env vars (except VAPID keys). The existing infrastructure serves everything through the tunnel.

4. **No cloud services. Period.** The developer has been explicit. Don't suggest AWS, Neon, Supabase, Railway, Vercel, or any hosted service. Everything runs on owned hardware. Cloudflare (domain/tunnel) is the only external service.

5. **Mac mini is coming.** When it arrives, it unlocks iOS builds and becomes the dedicated server. Until then, Windows handles Phases 1-3.
