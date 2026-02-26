# Packing List Page — Route Wiring

## What Changed

`app/(chef)/events/[id]/page.tsx` — added "Packing List" button in event header

## Context

`app/(chef)/events/[id]/pack/page.tsx` was already fully implemented (fetchPackingListData,
getPackingStatus, PackingListClient). No new page was needed.

## Change

Added a "Packing List" button in the event detail header button group, visible for all events
that are not in `draft` or `cancelled` status:

```tsx
{
  !['draft', 'cancelled'].includes(event.status) && (
    <Link href={`/events/${event.id}/pack`}>
      <Button variant="secondary">Packing List</Button>
    </Link>
  )
}
```

## Files Modified

- `app/(chef)/events/[id]/page.tsx`
