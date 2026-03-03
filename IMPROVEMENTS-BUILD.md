# ChefFlow Improvements Build — Exact Code Changes

## Strategy: Fix All Known Issues + Preempt Stricter Standards

Based on:

- Original audit: 41 dead links, 2 A11y issues
- Second audit: 2 dead links (95% reduction)
- Variant audit: 1 dead link (slow network), 4 A11y issues (WCAG3 stricter)

**Goal:** Reach 50+/100 health score by fixing remaining issues systematically.

---

## Priority 1: Dead Links (2 Remaining) — CRITICAL

### Issue: Links to non-existent routes or wrong hrefs

**Affected links from original audit likely still broken:**

- `/chef/chef-demo-showcase` — route doesn't exist
- Possibly `/chefs` or `/contact` if they don't have proper routing

**Fix Strategy:**

#### 1a. Find all internal href links

```bash
grep -r "href=['\"]/" components/ app/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".next"
```

#### 1b. Identify and fix broken links

**File: [components/*/navigation.tsx, app/*/layout.tsx] (where these links exist)**

```tsx
// BEFORE: Links pointing to non-existent routes
export const NAV_LINKS = [
  { href: '/chefs', label: 'Our Chefs' }, // might not exist
  { href: '/chef/chef-demo-showcase', label: 'Demo' }, // doesn't exist
  { href: '/contact', label: 'Contact' }, // might not exist
]

// AFTER: Fix routes
export const NAV_LINKS = [
  { href: '/directory', label: 'Our Chefs' }, // use existing route
  // Remove /chef/chef-demo-showcase entirely (no route)
  { href: '#contact', label: 'Contact', scroll: false }, // anchor link if on same page
]
```

**Action: Search & Replace**

1. Find all `href="/chef/chef-demo-showcase"` → remove or redirect
2. Find all `href="/chefs"` → change to `/directory` or another real route
3. Find all broken anchor links → verify anchors exist on target pages

---

## Priority 2: WCAG 3.0 Level AAA A11y Issues (4 Found) — HIGH

### Issue: Stricter accessibility standards finding violations

Common WCAG3 AAA issues we'll proactively fix:

#### 2a. Missing Skip-to-Main-Content Link

**File: [app/layout.tsx] OR [app/(chef)/layout.tsx, app/(client)/layout.tsx]**

```tsx
// BEFORE
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}

// AFTER: Add skip link (WCAG3 AAA requirement)
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {/* Skip to main content link — required for WCAG3 AAA */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only fixed top-0 left-0 z-50 bg-stone-950 text-white px-4 py-2 text-sm font-medium"
        >
          Skip to main content
        </a>

        {/* Sidebar/nav here */}
        <nav>...</nav>

        {/* Main content with id */}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  )
}
```

#### 2b. Form Labels Not Properly Associated (if any remain)

We already fixed BetaSignupForm and PublicPartnerSignupForm. Check for others:

```tsx
// BEFORE: Label without htmlFor
<label className="text-sm font-medium">
  Email
</label>
<input type="email" name="email" />

// AFTER: Proper association
<label htmlFor="email-input" className="text-sm font-medium">
  Email
</label>
<input id="email-input" type="email" name="email" />
```

**Search for:** All `<label>` tags without `htmlFor` → add `id` to corresponding input

#### 2c. Insufficient Color Contrast (WCAG3 AAA needs 7:1 ratio)

Check interactive elements (buttons, links) in focus/inactive states:

**File: [globals.css] or component-specific styles**

```css
/* BEFORE: 4.5:1 contrast (WCAG AA) */
.button-secondary {
  background-color: #8b8680; /* stone-500 */
  color: #fafaf8;
}

/* AFTER: 7:1 contrast (WCAG AAA) */
.button-secondary {
  background-color: #5f5a55; /* darker stone */
  color: #ffffff;
}

/* Focus indicators must be visible */
.button-secondary:focus-visible {
  outline: 3px solid #e88f47;
  outline-offset: 2px;
}
```

#### 2d. Missing Focus Indicators

**File: [globals.css]**

```css
/* WCAG3 AAA requires visible focus indicators on ALL interactive elements */

/* BEFORE: No focus visible styles */
button,
a,
input,
select,
textarea {
  /* no focus styles */
}

/* AFTER: Clear focus indicators */
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid #e88f47;
  outline-offset: 2px;
  border-radius: 0; /* No border-radius on outline */
}

/* Also for custom components */
[role='button']:focus-visible,
[role='link']:focus-visible {
  outline: 3px solid #e88f47;
  outline-offset: 2px;
}
```

---

## Priority 3: Anchor Link Validation — MEDIUM

### Issue: Pages with anchors but IDs don't exist

Specifically `/terms#s5` through `/terms#s20` were broken.

**File: [app/*/terms/page.tsx] OR wherever terms page is**

```tsx
// BEFORE: Headings without IDs
export default function TermsPage() {
  return (
    <main id="main-content">
      <h1>Terms of Service</h1>

      <section>
        <h2>1. Your Rights</h2> {/* No ID! */}
        ...
      </section>

      <section>
        <h2>5. Limitations</h2> {/* No ID! */}
        ...
      </section>
    </main>
  )
}

// AFTER: Add IDs to all sections
export default function TermsPage() {
  return (
    <main id="main-content">
      <h1>Terms of Service</h1>

      <section id="s1">
        <h2>1. Your Rights</h2>
        ...
      </section>

      <section id="s5">
        <h2>5. Limitations</h2>
        ...
      </section>

      {/* Add all missing sections: s2, s3, s4, s6, s7, s9-s20 */}
    </main>
  )
}
```

---

## Implementation Checklist

### Phase 1: Dead Links (30 min)

- [ ] Search for all broken href links
- [ ] Fix `/chef/chef-demo-showcase` (remove or redirect)
- [ ] Fix `/chefs` → `/directory` (or appropriate route)
- [ ] Fix `/contact` link (if broken)
- [ ] Verify all navigation links point to existing routes

### Phase 2: A11y WCAG3 (1-2 hours)

- [ ] Add skip-to-main-content link to layouts
- [ ] Check all form labels have htmlFor
- [ ] Audit color contrast on interactive elements
- [ ] Add/verify focus indicators on all interactive elements
- [ ] Test with keyboard navigation (Tab, Enter, Space)

### Phase 3: Anchor Links (30 min)

- [ ] Check `/terms` page has all section IDs (s1-s20)
- [ ] Check other pages with anchor links have proper IDs
- [ ] Test anchor navigation works (click link, page jumps)

### Phase 4: Validation (30 min)

```bash
npm run audit:variant    # Should show 0 dead links in RANDOMIZED_CRAWL
npm run audit:overnight  # Check main audit improves to 50+/100
```

---

## Expected Impact

| Metric              | Current | After     | Improvement      |
| ------------------- | ------- | --------- | ---------------- |
| Dead Links          | 2       | 0         | ✅ Fixed         |
| A11y Issues (WCAG2) | 0       | 0         | ✅ No regression |
| A11y Issues (WCAG3) | 4       | 0-1       | ✅ 75-100%       |
| Health Score        | 40/100  | 50-60/100 | ✅ +10-20 points |

---

## Exact Files to Modify

1. **Navigation/Layout files** (find broken links)
   - `components/*/nav-*.tsx`
   - `app/*/layout.tsx`
   - `app/*/page.tsx` (if has navigation)

2. **Form Components** (verify labels)
   - `components/forms/**/*.tsx`
   - `components/ui/input.tsx`, `select.tsx`, etc.

3. **Global Styles** (WCAG3 contrast + focus)
   - `styles/globals.css`
   - `app/layout.tsx` (global focus styles)

4. **Content Pages** (add missing IDs)
   - `app/*/terms/page.tsx` (anchor IDs)
   - `app/*/privacy/page.tsx` (if has anchors)
   - Any page with internal anchor links

---

## Notes

- **Why WCAG3 AAA?** The variant audit tests this standard. Fixing it ensures we pass future stricter audits.
- **Skip link:** Already a WCAG2 A requirement; we should have it.
- **Focus indicators:** Must be visible (not outline-width: 0).
- **Contrast:** WCAG3 AAA needs 7:1 for normal text, 4.5:1 minimum is not enough.

All changes are **additive** (no breaking changes, only improvements).
