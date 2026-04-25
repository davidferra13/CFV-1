# Codex Build Spec: Add Navigation Links for New Station Pages

> Priority: P1. Risk: LOW. 2 files (2 edits). No migrations. No new files.

## Problem

Three new pages were created but have no navigation links:

- `/stations/[id]/shift-history` - accessible from station detail page
- `/stations/waste/patterns` - accessible from waste log page
- `/stations/knowledge` - accessible from main stations page

## Files Touched (ONLY these)

1. **EDIT** `app/(chef)/stations/page.tsx` - Add "Knowledge Base" link
2. **EDIT** `app/(chef)/stations/waste/page.tsx` - Add "View Patterns" link
3. **EDIT** `app/(chef)/stations/[id]/page.tsx` - Add "Shift History" link

---

## Step 1: Add Knowledge Base link to stations page

In `app/(chef)/stations/page.tsx`, find this exact block:

```tsx
<Link
  href="/stations/menu-board"
  className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
>
  Menu Board
</Link>
```

Replace with:

```tsx
        <Link
          href="/stations/menu-board"
          className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
        >
          Menu Board
        </Link>
        <Link
          href="/stations/knowledge"
          className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
        >
          Knowledge Base
        </Link>
```

## Step 2: Add "View Patterns" link to waste page

In `app/(chef)/stations/waste/page.tsx`, find this exact block:

```tsx
<div>
  <h1 className="text-2xl font-bold text-stone-100">Waste Log</h1>
  <p className="mt-1 text-sm text-stone-500">
    Track waste and spoilage across all stations. Feeds into true food cost calculations.
  </p>
</div>
```

Replace with:

```tsx
<div className="flex items-start justify-between">
  <div>
    <h1 className="text-2xl font-bold text-stone-100">Waste Log</h1>
    <p className="mt-1 text-sm text-stone-500">
      Track waste and spoilage across all stations. Feeds into true food cost calculations.
    </p>
  </div>
  <Link
    href="/stations/waste/patterns"
    className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-600 px-3 py-2 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
  >
    View Patterns
  </Link>
</div>
```

## Step 3: Add "Shift History" link to station detail page

In `app/(chef)/stations/[id]/page.tsx`, find this exact block:

```tsx
<div className="flex gap-2">
  <Link href={`/stations/${params.id}/clipboard`}>
    <Button variant="primary">Open Clipboard</Button>
  </Link>
</div>
```

Replace with:

```tsx
<div className="flex gap-2">
  <Link
    href={`/stations/${params.id}/shift-history`}
    className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-600 px-3 py-2 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
  >
    Shift History
  </Link>
  <Link href={`/stations/${params.id}/clipboard`}>
    <Button variant="primary">Open Clipboard</Button>
  </Link>
</div>
```

---

## Rules / DO NOT

- Do NOT modify any other part of these files
- Do NOT add new imports (Link and Button are already imported in all three files)
- Do NOT change styling of existing elements
- Do NOT add any new components or client-side logic
- Do NOT use em dashes
- Do NOT touch any file other than the three listed above

## Verification

```bash
npx tsc --noEmit --skipLibCheck
```

If this passes, the task is complete.

## Escape Hatch

If any of the find blocks do not match exactly (file was modified since spec was written), look for the nearest equivalent and apply the same change pattern. If you cannot find a reasonable match, SKIP that specific step and report which step was skipped and why.
