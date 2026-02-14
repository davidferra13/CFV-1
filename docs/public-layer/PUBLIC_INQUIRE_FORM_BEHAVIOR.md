# Public Layer - Inquire Form Behavior

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Form Interaction

### On Page Load
- Form is empty (no pre-filled data)
- All fields enabled
- Submit button enabled

### On Input
- Client-side validation on blur
- Inline error messages
- Character count for message field (optional)

### On Submit
- Disable submit button
- Show loading indicator ("Submitting...")
- Validate all fields
- Submit via Server Action

### On Success
- Show success message
- Optionally clear form
- Scroll to success message

### On Error
- Show error message
- Re-enable submit button
- Keep form data (don't clear)
- Focus on error message

---

**Status**: LOCKED for V1.
