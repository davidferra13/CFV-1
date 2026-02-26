# Event Kanban Board

## What Was Built

A drag-and-drop Kanban board view for the ChefFlow V1 event pipeline, accessible at `/events/board`. It gives chefs a visual overview of all active events organised by FSM status, with the ability to advance events to the next stage by dragging a card from one column into the next.

No migrations were required — the feature reads from and writes to the existing `events` table via the already-established `transitionEvent` server action.

---

## Files Created

| File                                        | Role                                                                                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/events/board/page.tsx`          | Server component. Calls `requireChef()`, fetches events via `getEvents()`, maps to the lean `KanbanEvent` shape, renders the page shell (header, view toggle, board). |
| `components/events/event-kanban-board.tsx`  | Primary client component. Owns the `DndContext`, local event state, and the call to `transitionEvent`. Also exports the `KanbanEvent` type.                           |
| `components/events/event-kanban-column.tsx` | Client component. Renders a single droppable column with a colored top border, count badge, and scrollable card list.                                                 |
| `components/events/event-kanban-card.tsx`   | Client component. Renders a single draggable event card plus a lightweight `EventKanbanCardOverlay` used in the `DragOverlay`.                                        |
| `docs/EVENT_KANBAN_BOARD.md`                | This reflection document.                                                                                                                                             |

---

## Architecture Decisions

### Server / Client split

The page (`page.tsx`) is a server component: it performs the auth check (`requireChef()`), fetches data server-side, and hands a plain array to the client board. The board and all its children are client components that handle interactivity.

### Lean KanbanEvent shape

`getEvents()` returns the full event row plus joined `client`. The page maps the result to a minimal `KanbanEvent` type (7 fields) before passing it to the board. This keeps the client bundle small and avoids serialising unused server-side data.

### Optimistic updates + server action

When a card is dropped into a new column:

1. The local state is updated immediately (optimistic move) so the UI feels instant.
2. `transitionEvent` is called inside `useTransition` so it does not block the render.
3. On server error, the card is reverted to its previous column and `toast.error` is shown.
4. On success, `toast.success` confirms the move.

### FSM validation on both client and server

- **Client-side**: `ALLOWED_TRANSITIONS` map prevents invalid drag operations from ever reaching the server. Backwards moves, multi-step skips, and drops onto terminal columns each produce a specific `toast.error` message.
- **Server-side**: `transitionEvent` re-validates using `TRANSITION_RULES` independently. Even if a bad call slipped through, the server rejects it.

### Terminal columns

`completed` and `cancelled` are terminal states that cannot be entered via drag (completed requires the close-out wizard; cancelled requires a reason). Instead of interactive columns they appear as read-only pill counters below the board.

---

## Column Configuration

| Status      | Border Color | Allowed drag target for |
| ----------- | ------------ | ----------------------- |
| draft       | stone-400    | —                       |
| proposed    | amber-400    | draft                   |
| accepted    | blue-400     | proposed                |
| paid        | green-400    | accepted                |
| confirmed   | emerald-500  | paid                    |
| in_progress | brand-500    | confirmed               |

---

## UX Details

- **Drag activation distance**: 8 px threshold via `PointerSensor` — prevents accidental drags when clicking links inside cards.
- **Occasion name is a link**: clicking it opens `/events/[id]` without triggering a drag (`e.stopPropagation()`).
- **Loading overlay**: a semi-transparent overlay covers the board while a `useTransition` server call is in-flight.
- **DragOverlay**: a ghost card (`EventKanbanCardOverlay`) appears as the floating element during a drag, slightly rotated to convey movement.
- **Column scroll**: each column is independently scrollable (`max-h-[calc(100vh-320px)] overflow-y-auto`) so one busy stage does not expand the entire board.
- **View toggle**: two buttons at the top switch between `/events` (List) and `/events/board` (Board). The current view button is disabled to provide clear active state without a router dependency in a server component.

---

## Dependencies Used

- `@dnd-kit/core` ^6.3.1 — `DndContext`, `DragOverlay`, `PointerSensor`, `useSensor/useSensors`, `useDraggable`, `useDroppable`
- `@dnd-kit/utilities` ^3.2.2 — `CSS.Translate.toString` for drag transform style
- `sonner` ^2.0.7 — toast notifications for success/error
- `date-fns` ^4.1.0 — `format`, `parseISO` for event date display

All packages were already installed in the project.

---

## How It Connects to the System

- Reads from: `getEvents()` in `lib/events/actions.ts` (existing, unchanged)
- Writes via: `transitionEvent()` in `lib/events/transitions.ts` (existing, unchanged)
- Respects the same FSM rules (`TRANSITION_RULES`) as every other event transition surface
- Tenant scoping is enforced by `requireChef()` + RLS — no change to existing security model
- Revalidates `/events/[id]` paths automatically via `revalidatePath` inside `transitionEvent`
