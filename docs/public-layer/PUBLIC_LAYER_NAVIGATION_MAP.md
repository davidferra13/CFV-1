# Public Layer - Navigation Map

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

This document defines the complete navigation structure for the Public Layer, including header menu, footer links, and all user-facing navigation paths.

---

## Primary Navigation (Header)

### Desktop Header
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]   Home  Services  How It Works  Pricing  Inquire   │
│                                           [Sign In Button]  │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Header (≤768px)
```
┌───────────────────────────────┐
│  [Logo]           [☰ Menu]    │
└───────────────────────────────┘

When menu icon clicked:
┌───────────────────────────────┐
│  Home                         │
│  Services                     │
│  How It Works                 │
│  Pricing                      │
│  Inquire                      │
│  ─────────────────────────    │
│  Sign In                      │
└───────────────────────────────┘
```

---

## Header Navigation Items

### 1. Logo / Home
- **Label**: "ChefFlow" (or logo image)
- **Route**: `/`
- **Behavior**: Always links to home page
- **Styling**: Larger/bold text, left-aligned

### 2. Services
- **Label**: "Services"
- **Route**: `/services`
- **Behavior**: Direct link, no dropdown

### 3. How It Works
- **Label**: "How It Works"
- **Route**: `/how-it-works`
- **Behavior**: Direct link, no dropdown

### 4. Pricing
- **Label**: "Pricing"
- **Route**: `/pricing`
- **Behavior**: Direct link, no dropdown

### 5. Inquire
- **Label**: "Inquire" or "Contact Us"
- **Route**: `/inquire`
- **Behavior**: Direct link to form page
- **Styling**: Optional: Styled as secondary CTA button

### 6. Sign In (Conditional)
- **Label**: "Sign In"
- **Route**: `/signin`
- **Behavior**:
  - If user is NOT signed in: Link to signin page
  - If user IS signed in: Show "Go to Dashboard" or "Go to My Events" (based on role)
- **Styling**: Primary button (e.g., outline or solid)

---

## Footer Navigation

### Footer Layout
```
┌─────────────────────────────────────────────────────────────┐
│  ChefFlow                                                   │
│  Private Chef Management Platform                          │
│                                                             │
│  Quick Links          Legal            Contact             │
│  • Home               • Terms          Email: hello@...    │
│  • Services           • Privacy        Phone: (555) 123... │
│  • How It Works                                            │
│  • Pricing                                                 │
│  • Inquire                                                 │
│                                                             │
│  © 2026 ChefFlow. All rights reserved.                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Footer Links

### Quick Links Section
1. **Home** → `/`
2. **Services** → `/services`
3. **How It Works** → `/how-it-works`
4. **Pricing** → `/pricing`
5. **Inquire** → `/inquire`

### Legal Section
1. **Terms of Service** → `/terms`
2. **Privacy Policy** → `/privacy`

### Contact Section (Static Info)
- **Email**: hello@chefflow.app (example)
- **Phone**: (555) 123-4567 (example, optional)
- **Note**: NO contact form in footer (use /inquire page)

### Social Links (Optional, Placeholder)
- **Instagram**: `https://instagram.com/chefflow` (if applicable)
- **Twitter**: `https://twitter.com/chefflow` (if applicable)
- **Note**: Only include if accounts exist; otherwise omit

---

## Breadcrumbs

### NOT Implemented in V1
Breadcrumbs are NOT required for Public Layer (flat hierarchy).

**Rationale**: All pages are top-level, no nested structure. Users can always use main navigation.

**Future**: If sub-pages are added (e.g., `/services/private-dinners`), consider breadcrumbs in V1.1.

---

## Call-to-Action (CTA) Buttons

### Primary CTAs (Across Site)
1. **Sign Up** (Home page hero)
   - **Label**: "Get Started" or "Sign Up for Free"
   - **Route**: `/signup`
   - **Appearance**: Primary button (solid background, high contrast)

2. **Inquire** (Home, Services, Pricing pages)
   - **Label**: "Contact Us" or "Send Inquiry"
   - **Route**: `/inquire`
   - **Appearance**: Secondary button (outline or solid secondary color)

3. **Learn More** (Home page)
   - **Label**: "How It Works"
   - **Route**: `/how-it-works`
   - **Appearance**: Tertiary button (text link or ghost button)

---

## User Flow: Authenticated vs Unauthenticated

### Unauthenticated User
```
Landing (/)
    ↓
  Services (/services)
    ↓
  How It Works (/how-it-works)
    ↓
  Pricing (/pricing)
    ↓
  Inquire (/inquire) → Submit form → Success confirmation
    ↓
  Sign In (/signin) → Authenticate → Redirect to portal
```

### Authenticated User (Chef)
```
Landing (/)
  [Header shows "Go to Dashboard" instead of "Sign In"]
    ↓
  Click "Go to Dashboard" → /dashboard (Chef Portal)
```

### Authenticated User (Client)
```
Landing (/)
  [Header shows "Go to My Events" instead of "Sign In"]
    ↓
  Click "Go to My Events" → /my-events (Client Portal)
```

---

## Conditional Navigation Logic

### Sign In / Sign Out Button
```typescript
// In Header component
const session = await getSession();

if (!session) {
  // Show "Sign In" button
  return <Link href="/signin">Sign In</Link>;
}

// User is signed in - show portal link
const role = await getUserRole(session.user.id);

if (role === 'chef') {
  return <Link href="/dashboard">Go to Dashboard</Link>;
}

if (role === 'client') {
  return <Link href="/my-events">Go to My Events</Link>;
}
```

---

## Navigation Accessibility

### Keyboard Navigation
- All nav links MUST be keyboard-accessible (Tab key)
- Focus states MUST be visible (outline or border)
- Mobile menu MUST be keyboard-operable (open/close with Enter)

### Screen Reader Support
- Semantic HTML: `<nav>`, `<ul>`, `<li>`
- ARIA labels on icons (e.g., `aria-label="Menu"` on hamburger)
- Skip to content link (optional but recommended)

### Focus Order
```
1. Skip to content (optional)
2. Logo
3. Navigation links (left to right)
4. Sign In button
5. Main content
6. Footer links
```

---

## Mobile Navigation Behavior

### Hamburger Menu Interaction
1. User taps hamburger icon (☰)
2. Menu slides in from right or expands below header
3. Overlay appears behind menu (semi-transparent backdrop)
4. User taps link → menu closes, navigate to page
5. User taps outside menu → menu closes
6. User taps X icon → menu closes

### Menu Animation (Optional)
- Slide-in: `transform: translateX(100%) → translateX(0)`
- Fade-in: `opacity: 0 → 1`
- Duration: 200-300ms (fast, not distracting)

---

## Navigation State Management

### Active Link Highlighting
- Current page link MUST have visual indicator (underline, bold, different color)
- Implementation: Check `pathname` from `usePathname()` hook

```typescript
'use client';
import { usePathname } from 'next/navigation';

export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={isActive ? 'font-bold underline' : ''}
      aria-current={isActive ? 'page' : undefined}
    >
      {label}
    </Link>
  );
}
```

---

## Sticky Header (Optional)

### Desktop
- Header MUST remain visible on scroll (position: sticky)
- Top offset: 0px
- Background: Solid (not transparent, to avoid content bleeding through)
- Optional: Reduce height on scroll for more content space

### Mobile
- Header MUST remain visible on scroll
- Consider collapsing height on scroll (save vertical space)

---

## Navigation on Non-Standard Pages

### /signin Page
- Header: Same as other pages
- Footer: Same as other pages
- Note: If user is already signed in, middleware redirects away (no header visible)

### /signup Page
- Header: Same as other pages
- Footer: Same as other pages
- Note: If user is already signed in, middleware redirects away

### /terms and /privacy Pages
- Header: Same as other pages
- Footer: Same as other pages
- Breadcrumbs: NOT needed (legal pages are top-level)

---

## Sitemap (For Reference)

```
/
├── /services
├── /how-it-works
├── /pricing
├── /inquire
├── /signin
├── /signup
├── /terms
└── /privacy
```

**Note**: No sitemap.xml required for V1 (can add post-launch for SEO).

---

## SEO Considerations

### Navigation Links
- All nav links MUST be `<a>` tags (not buttons styled as links)
- Links MUST have descriptive text (no "Click here")
- Links MUST be crawlable (no JavaScript-only navigation)

### Internal Linking
- Every page should link back to home (via logo)
- Footer provides alternate navigation paths (redundancy)

---

## Navigation Performance

### Preloading
- Next.js automatically prefetches links in viewport
- NO additional preloading needed

### Code Splitting
- Navigation component MUST be included in main bundle (not lazy-loaded)
- Header and Footer are critical UI, must render immediately

---

## Verification Checklist

Before considering navigation "complete":

- [ ] All header links work on desktop and mobile
- [ ] Mobile menu opens/closes correctly
- [ ] Active page is highlighted in nav
- [ ] Signed-in users see portal link instead of "Sign In"
- [ ] All footer links work
- [ ] Keyboard navigation works (Tab key)
- [ ] Screen reader announces navigation correctly
- [ ] Focus states are visible
- [ ] No console errors on navigation
- [ ] No broken links (404s)

---

**Status**: This navigation structure is LOCKED for V1.
