# Fix: Pre-fill Re-booking Form from Client Profile (JBUG-019)

## Problem

`app/(client)/book-now/page.tsx` already calls `requireClient()` to get the authenticated user, but passes zero client data to `PublicInquiryForm`. The form starts empty. A returning client must re-enter their name, email, phone, address, and dietary info manually.

## Approach

Two files change:

1. `app/(client)/book-now/page.tsx` -- fetch client profile, pass pre-fill props
2. `components/public/public-inquiry-form.tsx` -- accept optional pre-fill props, use as initial state

## Change 1: book-now/page.tsx

**File:** `app/(client)/book-now/page.tsx`

### Current file (full):

```tsx
import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PublicInquiryForm } from '@/components/public/public-inquiry-form'

export const metadata: Metadata = {
  title: 'Book Now',
}

export default async function BookNowPage({
  searchParams,
}: {
  searchParams: Promise<{ circleId?: string }>
}) {
  const params = await searchParams
  const user = await requireClient()
  const db: any = createServerClient()

  // Look up the chef's name and slug from the client's tenant
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name, public_slug')
    .eq('id', user.tenantId!)
    .single()

  const chefData = chef as Record<string, unknown> | null
  const chefName =
    (chefData?.display_name as string) ?? (chefData?.business_name as string) ?? 'Your Chef'
  const chefSlug = (chefData?.public_slug as string) ?? ''

  return (
    <div className="max-w-2xl mx-auto">
      <PublicInquiryForm
        chefSlug={chefSlug}
        chefName={chefName}
        primaryColor="#1c1917"
        circleId={params.circleId}
      />
    </div>
  )
}
```

### Replace the FULL file with:

```tsx
import type { Metadata } from 'next'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PublicInquiryForm } from '@/components/public/public-inquiry-form'

export const metadata: Metadata = {
  title: 'Book Now',
}

export default async function BookNowPage({
  searchParams,
}: {
  searchParams: Promise<{ circleId?: string }>
}) {
  const params = await searchParams
  const user = await requireClient()
  const db: any = createServerClient()

  // Look up the chef's name and slug from the client's tenant
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name, public_slug')
    .eq('id', user.tenantId!)
    .single()

  // Look up the client profile for pre-fill
  const { data: clientProfile } = await db
    .from('clients')
    .select('full_name, email, phone, address, dietary_restrictions, allergies')
    .eq('id', user.entityId)
    .single()

  const chefData = chef as Record<string, unknown> | null
  const chefName =
    (chefData?.display_name as string) ?? (chefData?.business_name as string) ?? 'Your Chef'
  const chefSlug = (chefData?.public_slug as string) ?? ''

  const profile = clientProfile as Record<string, unknown> | null

  return (
    <div className="max-w-2xl mx-auto">
      <PublicInquiryForm
        chefSlug={chefSlug}
        chefName={chefName}
        primaryColor="#1c1917"
        circleId={params.circleId}
        defaultValues={{
          full_name: (profile?.full_name as string) ?? '',
          email: (profile?.email as string) ?? user.email ?? '',
          phone: (profile?.phone as string) ?? '',
          address: (profile?.address as string) ?? '',
          dietary_notes: [
            (profile?.dietary_restrictions as string) ?? '',
            (profile?.allergies as string) ?? '',
          ]
            .filter(Boolean)
            .join('. '),
        }}
      />
    </div>
  )
}
```

## Change 2: public-inquiry-form.tsx

**File:** `components/public/public-inquiry-form.tsx`

### Step A: Find the Props type (around lines 28-37). Add `defaultValues?`:

Find:

```tsx
type Props = {
  chefSlug: string
  chefName: string
  primaryColor?: string
  circleId?: string
}
```

Replace with:

```tsx
type Props = {
  chefSlug: string
  chefName: string
  primaryColor?: string
  circleId?: string
  defaultValues?: {
    full_name?: string
    email?: string
    phone?: string
    address?: string
    dietary_notes?: string
  }
}
```

### Step B: Find the component destructuring (the line that destructures props). Add `defaultValues`:

Find wherever the props are destructured, for example:

```tsx
export function PublicInquiryForm({ chefSlug, chefName, primaryColor, circleId }: Props) {
```

Replace with:

```tsx
export function PublicInquiryForm({ chefSlug, chefName, primaryColor, circleId, defaultValues }: Props) {
```

### Step C: Find the useState initializer for formData (around lines 159-175). Use defaultValues:

Find the `useState<FormData>` call. It has fields initialized to `''`. Change only these five fields to use defaultValues:

- `full_name: ''` becomes `full_name: defaultValues?.full_name ?? ''`
- `email: ''` becomes `email: defaultValues?.email ?? ''`
- `phone: ''` becomes `phone: defaultValues?.phone ?? ''`
- `address: ''` becomes `address: defaultValues?.address ?? ''`
- Find the field for dietary notes / additional info. If there is a `dietary_notes` or `additional_info` or `notes` field, set it to `defaultValues?.dietary_notes ?? ''`

**IMPORTANT:** Only change the initial values of these specific fields. Do NOT change any other field in the useState initializer. Do NOT change the FormData type.

### Step D: Disable draft restoration when defaultValues are provided.

Find the `loadDraft` / `saveDraft` logic. If `defaultValues` has any non-empty value, skip loading the saved draft (so pre-fill takes precedence over old session drafts). Look for a useEffect that calls `loadDraft`. Add a guard:

```tsx
// Only load draft if no pre-fill values were provided
if (!defaultValues?.full_name && !defaultValues?.email) {
  // existing loadDraft logic here
}
```

## Rules

- Do NOT remove any existing functionality.
- Do NOT change the form layout, validation, or submission logic.
- Do NOT change any other files.
- The `defaultValues` prop is OPTIONAL. The form must still work without it (all public pages pass no defaultValues).
- If the `clients` table does not have a column named exactly `dietary_restrictions` or `allergies`, check the schema in `database/schema.ts` or `types/database.ts` for the correct column names and adjust.
- Run `npx tsc --noEmit --skipLibCheck` after all edits. It must pass.
