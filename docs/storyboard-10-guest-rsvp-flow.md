# Storyboard #10: Guest RSVP Flow (Dual-Perspective)

> "Send the link. They handle the rest."
> Duration: 45 seconds | Format: 1920x1080 (YouTube 16:9) | Auth: chef + guest (token link, no auth)

---

## The pitch in one sentence

The chef sends RSVP links to guests. Guests fill in dietary needs, confirm attendance, vote on dates. All of it flows back to the chef automatically: guest count updates, dietary matrix populates, date gets confirmed. Zero back-and-forth texts.

---

## FRAME-BY-FRAME STORYBOARD

### SCENE 1: TITLE CARD (0:00 - 0:03)

```
Main text (white, bold, 42px):
"Send the link. They handle the rest."

Subtitle (brand orange #e88f47, uppercase, 18px):
"GUEST RSVP."

Footer (white, 40% opacity, 16px):
CHEFFLOW
```

**Caption:** none | **Cursor:** hidden | **Progress bar:** 0% | **Duration:** 3 seconds

---

### SCENE 2: CHEF SENDS RSVP LINKS (0:03 - 0:10)

**Transition:** Instant cut. Perspective label: "CHEF'S VIEW" (orange bar left).

**Visual:** Chef portal, event detail. RSVP section or guest management panel.

**Action sequence:**

1. (0:03) Event detail page. Guest/RSVP panel visible with "Send RSVP" button or guest list with invite status.
2. (0:04) Caption appears.
3. (0:05) Cursor clicks "Send RSVP Links" or "Invite Guests." Click burst.
4. (0:06) Modal shows: guest list with email/phone fields, or a shareable RSVP link.
5. (0:07) Cursor clicks "Send" or "Copy Link." Click burst.
6. (0:08) Success: "RSVP links sent to 6 guests."
7. (0:09) Caption changes.
8. (0:10) Brief pause.

**Captions (in sequence):**

- (0:04) "Send RSVP links to every guest. One click."
- (0:09) "Six guests. Six links. Done."

**Cursor:** Visible
**Progress bar:** 0% -> 22%

---

### SCENE 3: GUEST FILLS THE FORM (0:10 - 0:23)

**Transition:** Flash to dark (0.15s). Perspective label: "GUEST'S VIEW" (blue bar right).

**Visual:** Guest RSVP page (no auth required, token-based link). Clean, mobile-friendly form.

**Action sequence:**

1. (0:10) RSVP page loads. Simple, clean layout: event name at top ("Anniversary Dinner, March 14"), chef's name, a warm welcome message.
2. (0:11) Caption appears.
3. (0:12) Form sections visible: "Will you attend?" (Yes/No), dietary restrictions, availability preferences.
4. (0:13) Cursor clicks "Yes, I'll be there." Click burst. Green checkmark.
5. (0:14) Caption changes. Scroll to dietary section.
6. (0:15) Dietary form: checkboxes for common allergies (nut, dairy, gluten, shellfish), text field for "Other dietary needs."
7. (0:16) Cursor checks "Nut allergy." Click burst.
8. (0:17) Cursor clicks the "Other" text field. Types: "No cilantro please."
9. (0:19) Continue scrolling. Photo consent checkbox: "I consent to event photos."
10. (0:20) Cursor checks the consent box. Click burst.
11. (0:21) Cursor clicks "Submit RSVP." Click burst.
12. (0:22) Success page: "Thank you! Chef David has your details. See you March 14."
13. (0:23) Caption changes.

**Captions (in sequence):**

- (0:11) "Guest opens the link. No login needed."
- (0:14) "Dietary needs? Check the boxes. Add a note."
- (0:23) "Submitted. Chef gets everything instantly."

**Cursor:** Visible
**Progress bar:** 22% -> 52%

---

### SCENE 4: CHEF SEES UPDATED DATA (0:23 - 0:35)

**Transition:** Flash to dark (0.15s). Back to "CHEF'S VIEW" (orange bar left).

**Visual:** Chef's event detail. Guest list has updated with RSVP responses.

**Action sequence:**

1. (0:23) Event detail, guest panel. RSVP status shows: 4/6 confirmed, 2 pending.
2. (0:24) Caption appears.
3. (0:25) Zoom in (1.4x) on the guest list. Each guest shows: name, RSVP status (confirmed/pending), dietary flags (icons for allergies).
4. (0:26) Callout pointing to a confirmed guest with a nut allergy icon: "Nut allergy flagged"
5. (0:27) Zoom out.
6. (0:28) Scroll down to the dietary matrix/summary. Aggregated view: "1 nut allergy, 1 vegan, 1 no cilantro."
7. (0:30) Zoom in (1.5x) on the dietary matrix.
8. (0:31) Callout: "Every restriction. One summary."
9. (0:32) Zoom out. Caption changes.
10. (0:33) Zoom in (1.3x) on the guest count: "4/6 confirmed." Progress bar visual.
11. (0:34) Callout: "4 confirmed. 2 to go."
12. (0:35) Zoom out.

**Captions (in sequence):**

- (0:24) "Your guest list updates automatically."
- (0:29) "Allergies, preferences. All in one matrix."
- (0:33) "Track who's confirmed. Follow up on the rest."

**Cursor:** Hidden (zooms carry the scene)
**Progress bar:** 52% -> 82%

---

### SCENE 5: CLOSING TITLE CARD (0:35 - 0:42)

**Transition:** Fade to dark (0.4s)

```
Main text (white, bold, 42px):
"Guests RSVP. You focus on the food."

Subtitle (brand orange #e88f47, uppercase, 18px):
"START FREE AT CHEFLOWHQ.COM"

Footer (white, 40% opacity, 16px):
CHEFFLOW
```

**Caption:** none | **Cursor:** hidden | **Progress bar:** 100% | **Duration:** 7 seconds

---

## A-HA MOMENTS (3 total)

1. **Speed:** RSVP links sent in one click. Guests don't need accounts or logins.
2. **Intelligence:** Dietary data from guest forms auto-populates the dietary matrix. The chef never manually enters "Sarah has a nut allergy."
3. **Both sides:** The guest experience is simple and warm. The chef sees everything aggregated and actionable.

## CAPTION COUNT: 9 total

## PRODUCTION NOTES

- The guest RSVP page is a token-based link (no auth). The Playwright browser can load it directly without logging in.
- Need functional RSVP form that submits data back to the event. If the RSVP feature isn't fully built, simulate: show the form, then cut to the chef view where guest data is pre-seeded.
- The dietary matrix aggregation is the key visual. If it's not built as a dedicated widget, the individual guest dietary flags on the guest list are sufficient.
- This is a short video (45s). Five compact scenes. Every second is tight. The guest form-filling scene (Scene 3) is the longest at 13 seconds and carries the most action.
- Mobile-friendly layout on the RSVP form is important visually. Even though we're recording at 1920x1080, the form should look like it would be great on a phone (centered, not stretched edge-to-edge).
- The "no cilantro please" detail is intentional: it shows the free-text field catches preferences that checkboxes can't, making the form feel thorough.
