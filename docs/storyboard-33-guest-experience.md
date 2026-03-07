# Storyboard #33: Guest Experience

> "Guests RSVP, share allergies, and see the recap. No app needed."
> Duration: 45 seconds | Format: 1920x1080 (YouTube 16:9) | Auth: none (token links)

---

## FRAME-BY-FRAME STORYBOARD

### SCENE 1: TITLE CARD (0:00 - 0:03)

```
Main text: "Your guests handle themselves."
Subtitle: "NO APP. NO LOGIN."
```

### SCENE 2: RSVP LINK (0:03 - 0:13)

**Visual:** Guest RSVP page accessed via token link.

1. (0:03) RSVP page loads. Clean, mobile-friendly: event name, date, host name, warm welcome.
2. (0:05) Caption: "Guest gets a link. Opens it. Done."
3. (0:07) Form: "Will you attend?" Yes/No. Dietary restrictions checkboxes. Text field for notes.
4. (0:09) Cursor fills: "Yes," checks "Gluten-free," types "Prefer white wine."
5. (0:11) Clicks "Submit." Success message.
6. (0:12) Caption: "RSVP'd. Allergies captured. 30 seconds."
7. (0:13) Brief pause.

**Progress bar:** 0% -> 30%

### SCENE 3: DIETARY FORM (0:13 - 0:20)

**Visual:** A different guest's dietary form with more detail.

1. (0:13) New guest's RSVP page. Different dietary needs.
2. (0:14) Caption: "Every guest fills their own form."
3. (0:16) This guest: severe nut allergy, vegan, provides details: "Anaphylactic. Carries EpiPen."
4. (0:18) Zoom in on the severity note. Callout: "Severity matters"
5. (0:19) Zoom out. Submit.
6. (0:20) Brief pause.

**Progress bar:** 30% -> 45%

### SCENE 4: PHOTO CONSENT (0:20 - 0:25)

**Visual:** Photo consent section of the RSVP form.

1. (0:20) Photo consent checkbox: "I consent to event photography."
2. (0:21) Caption: "Photo consent. Built right in."
3. (0:23) Cursor checks the box.
4. (0:24) Caption: "One less thing the chef has to ask."
5. (0:25) Brief pause.

**Progress bar:** 45% -> 56%

### SCENE 5: AVAILABILITY VOTING (0:25 - 0:30)

**Visual:** Date voting page for a group event.

1. (0:25) Availability voting page. Calendar with proposed dates.
2. (0:26) Caption: "Pick a date. Vote with the group."
3. (0:28) Cursor selects 2 available dates. Votes submitted.
4. (0:29) "3/5 votes in. Almost decided."
5. (0:30) Brief pause.

**Progress bar:** 56% -> 68%

### SCENE 6: EVENT RECAP (0:30 - 0:36)

**Visual:** Post-event recap page accessible to guests.

1. (0:30) Event recap page: "Thanks for joining! Here's a look back."
2. (0:31) Caption: "After the event. A recap they can revisit."
3. (0:33) Photos from the event (if available), menu that was served, thank you note from the chef.
4. (0:35) Callout: "Memories. Shareable."
5. (0:36) Brief pause.

**Progress bar:** 68% -> 82%

### SCENE 7: CLOSING TITLE CARD (0:36 - 0:43)

```
Main text: "Happy guests. Informed chef. No friction."
Subtitle: "START FREE AT CHEFLOWHQ.COM"
```

**Duration:** 7 seconds | **Progress bar:** 100%

---

## PRODUCTION NOTES

- All pages are token-link based (no auth). Playwright can access them directly with the token URL.
- RSVP, dietary form, photo consent, and availability voting may be different pages or sections of the same form.
- Event recap page may not be built. If so, show a simulated post-event thank you page.
- Mobile-friendly layout is important since guests will typically access on their phones.
