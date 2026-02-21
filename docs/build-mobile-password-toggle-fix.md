# Fix: Mobile Password Toggle

## What Changed

**File:** `components/ui/input.tsx`

The show/hide password button's event handler was changed from `onClick` to `onPointerDown` with `e.preventDefault()`.

## Why

On mobile browsers, tapping the toggle button while the password input is focused causes a `blur` event on the input before the `click` event fires. In some cases the browser suppresses or delays the click entirely, making the toggle appear unresponsive.

`onPointerDown` fires before `blur`, so the state flip happens before any focus transition. `e.preventDefault()` stops the browser from moving focus from the input to the button — the keyboard stays open, the input stays active, and the toggle works reliably on first tap.

## How It Connects

The `Input` component is the single shared component used on every auth form (sign in, chef signup, client signup). This one-line fix covers all password fields in the app.

`onPointerDown` is a unified pointer event that covers both mouse clicks (desktop) and touch taps (mobile), so desktop behavior is unchanged.
