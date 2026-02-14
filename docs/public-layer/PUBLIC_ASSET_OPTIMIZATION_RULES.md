# Public Layer - Asset Optimization Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Images

### MUST Use Next.js Image Component

```tsx
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority // For above-fold images
/>
```

**Benefits**: Automatic WebP/AVIF, lazy loading, responsive sizing

---

## Fonts

### MUST Use next/font

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return <html className={inter.className}>{children}</html>;
}
```

**Benefits**: Self-hosted, zero layout shift

---

## CSS

- Use Tailwind production build (automatic purging)
- NO custom CSS files unless absolutely necessary
- Target: <50 KB total CSS

---

## JavaScript

- Server Components by default (zero JS)
- Client Components only when needed
- Target: <150 KB total JS bundle

---

**Status**: LOCKED for V1.
