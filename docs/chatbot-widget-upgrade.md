# Chatbot Widget Upgrade — Landing Page

**Date:** 2026-02-22
**Branch:** feature/risk-gap-closure

## What Changed

The Remy concierge on the landing page was an inline section that looked like a search bar or email input — not recognizable as a chatbot. Visitors didn't know they could interact with it.

### Before

- `RemyConciergeSection` rendered inline in the page flow with a textarea input
- Looked like a search bar or email capture form
- `RemyConciergeWidget` (the proper floating chatbot) explicitly hid itself on the landing page

### After

- **Floating chatbot widget** now shows on ALL public pages, including landing
- Opens by default on first visit — immediately recognizable as a chatbot
- Branded header with Remy avatar, "Online now" green dot, minimize/close buttons
- Welcome message appears as a chat bubble from Remy (not placeholder text)
- Starter suggestion pills below the welcome message
- Typing indicator uses bouncing dots (not a spinner)
- Collapsible — when minimized, shows a "Chat with Remy" pill with a pulsing green dot
- Remembers collapsed state per session via `sessionStorage`
- Inline section replaced with a simple text CTA pointing to the chatbot

## Files Modified

| File                                          | Change                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `components/public/remy-concierge-widget.tsx` | Rewrote — now shows on landing page, opens by default, proper chatbot UI |
| `app/(public)/page.tsx`                       | Replaced `RemyConciergeSection` import with a simple CTA section         |

## Files NOT Modified (still exist, unused on landing)

- `components/public/remy-concierge-section.tsx` — still exists for potential reuse, no longer imported by landing page

## Design Decisions

- Widget opens by default because people recognize floating chatbots and know to interact with them
- Green "online" dot gives a sense of a live agent ready to help
- Chat bubbles have slightly different border-radius on the "tail" side for a natural chat feel
- Bouncing dots typing indicator feels more human than a spinner
- Starter pills use the same `getStarterPainPoints()` from the feature map
