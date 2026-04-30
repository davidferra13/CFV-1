# ChefFlow Mobile Testing Lab

This is the working mobile QA path for a Windows developer with an Android phone and no Apple hardware.

## What Each Layer Proves

| Layer                  | Command or tool                                  | Proves                                                                          | Does not prove                                 |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------- |
| Responsive baseline    | `npm run test:mobile:audit`                      | Layout, route rendering, overflow, console errors across core mobile widths     | Real device browser quirks                     |
| Android Chrome profile | `npm run test:mobile:android`                    | Samsung-style touch, scale, and Chrome user-agent behavior                      | Real phone hardware, camera, keyboard, network |
| iPhone WebKit profile  | `npm run test:mobile:iphone`                     | WebKit rendering with iPhone-style touch, scale, and Safari user-agent behavior | Real iOS Safari device bugs                    |
| Real Samsung           | Physical Samsung on debug mode                   | Android truth for touch, keyboard, installability, performance, sensors         | iOS Safari                                     |
| Real iPhone cloud      | BrowserStack Live or Automate with Local Testing | Actual iPhone Safari behavior without owning an iPhone                          | Local hardware debugging                       |

## Daily Workflow

1. Run the cheap local audit while changing mobile UI:

   ```bash
   npm run test:mobile:audit
   ```

2. If the change touches mobile navigation, forms, PWA install behavior, camera, file upload, sticky positioning, safe areas, or payment flows, run both platform profiles:

   ```bash
   npm run test:mobile:android
   npm run test:mobile:iphone
   ```

3. Check the latest report:

   ```text
   reports/mobile-audit/latest.json
   ```

4. Open screenshots from the newest run:

   ```text
   reports/mobile-audit/<timestamp>/
   ```

## Public-Only iPhone Check

For homepage, pricing, public inquiry, and embed-facing changes:

```bash
npm run test:mobile:iphone:public
```

This skips auth bootstrap and runs only public routes.

## Release Mobile Smoke

Before a release candidate, preview the smoke plan:

```bash
node scripts/mobile-release-smoke.mjs --dry-run
```

Run the smoke suite:

```bash
node scripts/mobile-release-smoke.mjs
```

Use `--public-only` when the change only touches public pages and auth bootstrapping is not needed:

```bash
node scripts/mobile-release-smoke.mjs --public-only
```

The release smoke runs:

- Public iPhone WebKit smoke
- Authenticated Android Chrome smoke
- Authenticated iPhone WebKit smoke

## Real iPhone Without Buying One

Use BrowserStack when ChefFlow needs actual iOS Safari proof.

1. Start or use an existing ChefFlow environment.
2. In BrowserStack Live, enable Local Testing.
3. Open the local or beta URL from a real iPhone Safari session.
4. Walk the mobile-critical path manually.
5. Save the session screenshot or video link with the release notes.

Use this for release candidates and high-risk flows:

- Login and auth redirects
- Public inquiry submission
- Quote review and payment entry
- Client portal approval
- Mobile navigation and safe-area behavior
- PWA install and standalone mode
- Camera, file upload, or keyboard-heavy forms

## If The Samsung Cannot Be Plugged In

Use this fallback order:

1. `npm run test:mobile:android`
2. Chrome DevTools Device Mode for manual tapping
3. Android Studio emulator if hardware behavior matters
4. BrowserStack Android real device if a physical-device proof is needed

## Interpretation Rules

- Passing `test:mobile:iphone` means ChefFlow survived a local WebKit iPhone-style pass. It is not a real iPhone pass.
- Passing BrowserStack real iPhone Safari means the tested path works on that device, OS, and browser combination.
- Any horizontal overflow, 500 response, page error, or non-ignored console error in `latest.json` is a real mobile blocker until investigated.
- Do not mark mobile release-ready from desktop viewport checks alone.

## Release Checklist

- `reports/mobile-audit/latest.json` has zero failures.
- The newest run screenshots cover the changed mobile surface.
- Samsung physical-device smoke passed when Android behavior matters.
- BrowserStack real iPhone Safari smoke passed for auth, payment, PWA install, safe-area, camera, file upload, or keyboard-heavy flows.
- Any BrowserStack session link or screenshot is attached to the release notes.
- Remaining mobile risk is written plainly in the release notes instead of hidden as "green."
