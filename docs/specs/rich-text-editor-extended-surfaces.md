# Rich Text Editor - Extended Surfaces

## Prerequisite

**This spec depends on `rich-text-editor-dinner-circles.md` being merged first.** It assumes the following files already exist:

- `components/ui/rich-text-editor.tsx` (WYSIWYG editor component)
- `components/ui/rich-text-renderer.tsx` (read-only renderer)
- `components/ui/rich-text-editor-styles.css` (shared styles)

If those files do not exist, STOP. Do not attempt this spec.

## Summary

Extend the RichTextEditor to 3 additional public-facing surfaces where chefs write text that clients or the public see. These are small, contained swaps (replace a textarea with the RichTextEditor import).

---

## Surface 1: Booking Page Bio

**Why:** The booking page bio is the chef's public-facing introduction seen by every potential client. Rich formatting lets them structure their story, highlight specialties, and present professionally.

### File to modify: `components/settings/booking-page-settings.tsx`

1. Add import:

```tsx
import { RichTextEditor } from '@/components/ui/rich-text-editor'
```

2. Find the `<Textarea>` (or `<textarea>`) bound to `booking_bio_short` (look for that field name, or a placeholder like "bio" or "about" or "introduction").

3. Replace with:

```tsx
<RichTextEditor
  value={bookingBioShort}
  onChange={setBookingBioShort}
  placeholder="Tell potential clients about yourself, your style, and what makes your food special..."
  minHeight={120}
/>
```

Adjust the value/onChange to match whatever state variable the existing textarea uses.

### Public render: Find where `booking_bio_short` renders on the public booking page

The public booking page is likely at `app/(public)/book/[slug]/page.tsx` or similar. Find where the bio text renders (probably a `<p>` tag with `whitespace-pre-line`). Replace with:

```tsx
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
// ...
;<RichTextRenderer html={chef.bookingBioShort} />
```

---

## Surface 2: Onboarding Profile Bio

**Why:** Same field as the booking bio but edited during onboarding. Should match the editing experience.

### File to modify: `components/onboarding/onboarding-steps/profile-step.tsx`

1. Add import:

```tsx
import { RichTextEditor } from '@/components/ui/rich-text-editor'
```

2. Find the `<Textarea>` bound to the bio field.

3. Replace with:

```tsx
<RichTextEditor
  value={bio}
  onChange={setBio}
  placeholder="Tell clients about your culinary background and style..."
  minHeight={100}
/>
```

---

## Surface 3: Social Post Composer

**Why:** Social post captions benefit from formatting for emphasis and structure. The caption is drafted in ChefFlow before posting to external platforms.

### File to modify: `components/social/social-post-composer.tsx`

1. Add import:

```tsx
import { RichTextEditor } from '@/components/ui/rich-text-editor'
```

2. Find the `<Textarea>` for the post content/caption.

3. Replace with:

```tsx
<RichTextEditor
  value={caption}
  onChange={setCaption}
  placeholder="Write your post caption..."
  minHeight={100}
/>
```

**Note:** When the caption is exported/copied to external platforms, the HTML should be stripped to plain text. Add a utility if one doesn't exist:

```tsx
function stripHtml(html: string): string {
  if (typeof window === 'undefined') return html.replace(/<[^>]*>/g, '')
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}
```

Use this when copying/exporting captions to clipboard or external APIs.

---

## DO NOT

- **DO NOT** create new files (the component files already exist from the prerequisite spec)
- **DO NOT** modify the RichTextEditor or RichTextRenderer components
- **DO NOT** modify database schema or create migrations
- **DO NOT** touch any server actions
- **DO NOT** add `@ts-nocheck` or `@ts-ignore`

## Verification

- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] `npx next build --no-lint` succeeds
- [ ] Booking page settings shows rich text editor for bio
- [ ] Onboarding profile step shows rich text editor for bio
- [ ] Social post composer shows rich text editor for caption
