# Public Layer - Performance Model

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

This document defines performance targets, optimization strategies, and monitoring requirements for the Public Layer. Fast loading times are critical for SEO, user experience, and conversion rates.

---

## Performance Philosophy

### Core Principle
**The Public Layer MUST be the fastest part of ChefFlow**. Since marketing pages are the first impression, they must load instantly to reduce bounce rates and improve SEO rankings.

### Strategy
- **Static-first**: Pre-render everything possible at build time
- **Minimal JavaScript**: Ship only what's needed for interactivity
- **Progressive enhancement**: Core content works without JavaScript
- **Mobile-first**: Optimize for slow 3G networks first

---

## Performance Budget

### Hard Limits (Must Not Exceed)

| Metric | Target | Hard Limit | Measurement Tool |
|--------|--------|------------|------------------|
| **First Contentful Paint (FCP)** | <1.5s | 3s | Lighthouse |
| **Largest Contentful Paint (LCP)** | <2.5s | 4s | Lighthouse |
| **Time to Interactive (TTI)** | <3s | 5s | Lighthouse |
| **Cumulative Layout Shift (CLS)** | <0.1 | 0.25 | Lighthouse |
| **Total Blocking Time (TBT)** | <200ms | 600ms | Lighthouse |
| **Speed Index** | <3s | 4.3s | Lighthouse |
| **Total Page Size** | <500 KB | 1 MB | Network tab |
| **JavaScript Bundle** | <150 KB | 300 KB | Bundle analyzer |
| **CSS Size** | <50 KB | 100 KB | Tailwind production |
| **Images (Total)** | <300 KB | 500 KB | Next.js Image |
| **Fonts** | <100 KB | 150 KB | next/font |

---

## Core Web Vitals Targets

### LCP (Largest Contentful Paint)
**Target**: <2.5s
**What it measures**: Time for largest content element to render

**Optimization Strategies**:
- Use Next.js Image component with `priority` for hero images
- Preload critical fonts
- Minimize server response time (TTFB <200ms)
- Use Static Site Generation (SSG) for instant delivery

**Implementation**:
```tsx
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="ChefFlow Hero"
  width={1200}
  height={600}
  priority // Preload this image
  placeholder="blur"
/>
```

---

### FID (First Input Delay) / INP (Interaction to Next Paint)
**Target**: <100ms
**What it measures**: Time from user interaction to browser response

**Optimization Strategies**:
- Minimize main-thread JavaScript
- Code-split components (lazy load below-the-fold)
- Avoid long-running scripts
- Use Server Components (reduce client-side JS)

**Implementation**:
```tsx
import dynamic from 'next/dynamic';

// Lazy load components not needed immediately
const Newsletter = dynamic(() => import('@/components/Newsletter'), {
  loading: () => <p>Loading...</p>,
});
```

---

### CLS (Cumulative Layout Shift)
**Target**: <0.1
**What it measures**: Visual stability (unexpected layout shifts)

**Optimization Strategies**:
- Reserve space for images (width/height attributes)
- Reserve space for fonts (font-display: optional or swap)
- Avoid injecting content above existing content
- Use CSS aspect-ratio for responsive images

**Implementation**:
```tsx
<Image
  src="/logo.png"
  width={200}
  height={50}
  alt="Logo"
  // Next.js automatically reserves space
/>
```

```css
/* Reserve space for 16:9 video */
.video-container {
  aspect-ratio: 16 / 9;
}
```

---

## Rendering Strategy

### Static Site Generation (SSG)
**All marketing pages MUST use SSG**:
- `/`
- `/services`
- `/how-it-works`
- `/pricing`
- `/terms`
- `/privacy`

**Benefits**:
- Instant page load (served from CDN)
- No database queries on request
- SEO-friendly (fully rendered HTML)

**Implementation**:
```tsx
// app/(public)/page.tsx
export default async function HomePage() {
  // No data fetching - static content only
  return <Hero />;
}

// Next.js automatically uses SSG when no dynamic data fetching
```

---

### Server Components (Default)
All components MUST be Server Components unless client interactivity is needed.

**Benefits**:
- Zero JavaScript sent to client
- Fast server-side rendering
- Direct database access (if needed)

**When to use Client Components**:
- Form inputs with client-side validation
- Interactive UI (dropdowns, modals, tabs)
- Browser APIs (localStorage, geolocation)

**Implementation**:
```tsx
// Server Component (default)
export default function Hero() {
  return <h1>Welcome to ChefFlow</h1>;
}

// Client Component (only when needed)
'use client';
import { useState } from 'react';

export function InquiryForm() {
  const [name, setName] = useState('');
  // ...
}
```

---

## Asset Optimization

### Images

#### Next.js Image Component (Required)
```tsx
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  quality={85} // Default: 75
  placeholder="blur" // Optional: blur-up effect
  blurDataURL="data:image/..." // Optional: custom blur
/>
```

**Benefits**:
- Automatic WebP/AVIF conversion
- Lazy loading (below fold)
- Responsive sizing
- Blur-up placeholder

#### Image Optimization Checklist
- [ ] Use Next.js Image component (NOT `<img>`)
- [ ] Specify width/height to prevent CLS
- [ ] Use `priority` for above-the-fold images
- [ ] Compress images (TinyPNG, ImageOptim)
- [ ] Use WebP/AVIF format (Next.js automatic)
- [ ] Max resolution: 2x for retina displays (2400px for 1200px display)

---

### Fonts

#### next/font (Required)
```tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // or 'optional' for better CLS
  variable: '--font-inter',
});

export default function RootLayout({ children }: { children: React.Node }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

**Benefits**:
- Self-hosted fonts (no external requests)
- Automatic font subsetting
- Zero layout shift (font-display: swap)

#### Font Optimization Checklist
- [ ] Use `next/font` (NOT Google Fonts CDN)
- [ ] Load only used character subsets (`subsets: ['latin']`)
- [ ] Use `display: 'swap'` or `'optional'`
- [ ] Preload critical fonts
- [ ] Limit to 1-2 font families

---

### JavaScript

#### Bundle Size Reduction
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer

# Check JavaScript size
du -sh .next/static/chunks/*.js
```

#### Optimization Strategies
- Use Server Components (zero JS for static content)
- Code-split large components (dynamic imports)
- Tree-shake unused code (Next.js automatic)
- Avoid large libraries (e.g., use date-fns instead of moment.js)

#### Example: Lazy Loading
```tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false, // Don't render on server (client-only)
});
```

---

### CSS

#### Tailwind CSS Optimization
```javascript
// tailwind.config.ts
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**Benefits**:
- Automatic purging of unused CSS
- Minification in production
- PostCSS optimization

#### CSS Size Target
- Production CSS: <50 KB gzipped
- Verification:
  ```bash
  ls -lh .next/static/css/*.css
  ```

---

## Network Optimization

### CDN (Vercel Edge Network)
All static assets served from Vercel's global CDN (automatic).

**Benefits**:
- 100+ edge locations worldwide
- Automatic brotli compression
- HTTP/2 support
- Automatic SSL/TLS

---

### Compression
```javascript
// next.config.js
module.exports = {
  compress: true, // Enable gzip/brotli compression
};
```

**Verification**:
```bash
curl -I https://chefflow.app -H "Accept-Encoding: br"
# Check for: content-encoding: br (brotli)
```

---

### Resource Hints

#### Preconnect to External Origins
```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.Node }) {
  return (
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://*.supabase.co" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

#### Prefetch Critical Routes
Next.js automatically prefetches links in viewport (no config needed).

---

## Caching Strategy

### Static Assets (Images, CSS, JS)
**Cache-Control**: `public, max-age=31536000, immutable`
- Vercel automatically sets this for `/_next/static/*` files

### HTML Pages (SSG)
**Cache-Control**: `s-maxage=31536000, stale-while-revalidate`
- Vercel Edge Network caches for 1 year
- Revalidates in background

### API Routes (Inquiry Form)
**Cache-Control**: `no-store` (never cache POST requests)

---

## Performance Monitoring

### Build-Time Checks
```bash
# Run Lighthouse during build
npm run build
npm run lighthouse

# Check bundle size
npm run analyze
```

### Lighthouse CI (Recommended)
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://chefflow-preview.vercel.app/
            https://chefflow-preview.vercel.app/services
          uploadArtifacts: true
```

---

### Real User Monitoring (RUM)

#### V1: No RUM (Launch without analytics)
- Focus on synthetic testing (Lighthouse)
- Add RUM in V1.1 if needed

#### V1.1: Web Vitals Reporting
```tsx
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }: { children: React.Node }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## Performance Testing

### Pre-Deployment Checklist

#### Lighthouse (Desktop)
```bash
lighthouse https://chefflow-preview.vercel.app \
  --preset=desktop \
  --only-categories=performance \
  --output=html
```

**Targets**:
- Performance score: ≥90
- FCP: <1.5s
- LCP: <2.5s
- CLS: <0.1

---

#### Lighthouse (Mobile)
```bash
lighthouse https://chefflow-preview.vercel.app \
  --preset=mobile \
  --throttling.cpuSlowdownMultiplier=4 \
  --only-categories=performance
```

**Targets**:
- Performance score: ≥85 (mobile is slower)
- FCP: <2s
- LCP: <3s

---

#### WebPageTest
```
URL: https://chefflow-preview.vercel.app
Location: Dulles, Virginia (Cable)
Browser: Chrome
Connection: 3G (Slow)
```

**Targets**:
- First Byte: <200ms
- Start Render: <1s
- Fully Loaded: <3s

---

### Performance Regression Detection

#### Automated Checks
```json
// lighthouse-config.json
{
  "ci": {
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", { "maxNumericValue": 1500 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }]
      }
    }
  }
}
```

---

## Third-Party Script Performance

### Avoid Third-Party Scripts in V1
- NO Google Analytics
- NO Facebook Pixel
- NO Hotjar/FullStory
- NO chat widgets

**Rationale**: Third-party scripts slow down page load and hurt Core Web Vitals.

---

### If Third-Party Scripts are Required (V1.1)

#### Load Asynchronously
```tsx
import Script from 'next/script';

<Script
  src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
  strategy="afterInteractive" // Load after page is interactive
/>
```

#### Strategies
- `beforeInteractive`: Load before page is interactive (critical scripts only)
- `afterInteractive`: Load after page is interactive (analytics)
- `lazyOnload`: Load during idle time (non-critical)

---

## Mobile Performance

### Mobile-First Optimization
- Test on real devices (iPhone SE, Android mid-range)
- Throttle network (Slow 3G) in DevTools
- Reduce image sizes for mobile viewports

### Responsive Images
```tsx
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  sizes="(max-width: 768px) 100vw, 1200px"
  // Automatically serves smaller image on mobile
/>
```

---

## Database Performance (Public Layer)

### No Database Queries on Page Render
- Marketing pages MUST be static (no DB queries)
- Only API routes/Server Actions query database

### Inquiry Form Optimization
```typescript
// Use prepared statement (Supabase handles this)
const { data, error } = await supabase
  .from('inquiries')
  .insert({
    name: sanitizedName,
    email: sanitizedEmail,
    message: sanitizedMessage,
  });
```

**Performance**: <50ms for INSERT query

---

## Error Budget

### 95th Percentile Targets
If 95% of users experience these metrics, consider successful:

| Metric | 95th Percentile Target |
|--------|----------------------|
| FCP | <2s |
| LCP | <3s |
| CLS | <0.15 |
| TTI | <4s |

---

## Performance Degradation Scenarios

### Slow Network (Slow 3G)
- **Target**: Page still usable within 5s
- **Mitigation**: Aggressive compression, minimal JS, image optimization

### High Latency (500ms RTT)
- **Target**: First paint within 2s
- **Mitigation**: Static pages (no server round-trip), CDN edge caching

### Low-End Devices (4x CPU slowdown)
- **Target**: Interactive within 5s
- **Mitigation**: Minimal JavaScript, Server Components

---

## Continuous Performance Monitoring

### Weekly Performance Audit
```bash
# Run Lighthouse on all routes
./scripts/lighthouse-all-pages.sh

# Check for regressions
npm run perf:check
```

### Alerts
- Slack/email alert if Lighthouse score drops below 90
- Alert if bundle size exceeds 300 KB

---

## Verification Checklist

Before deploying Public Layer:

- [ ] Lighthouse Performance score ≥90 (desktop)
- [ ] Lighthouse Performance score ≥85 (mobile)
- [ ] FCP <1.5s (desktop), <2s (mobile)
- [ ] LCP <2.5s (desktop), <3s (mobile)
- [ ] CLS <0.1
- [ ] JavaScript bundle <150 KB
- [ ] CSS <50 KB
- [ ] Total page size <500 KB
- [ ] All images use Next.js Image component
- [ ] Fonts use next/font (self-hosted)
- [ ] No third-party scripts (V1)
- [ ] All marketing pages are static (SSG)
- [ ] No database queries on page render

---

**Status**: This performance model is LOCKED for V1. Performance budgets are enforced.
