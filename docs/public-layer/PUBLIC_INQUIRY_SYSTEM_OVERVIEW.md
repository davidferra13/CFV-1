# Public Layer - Inquiry System Overview

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

The Inquiry System captures lead information from prospective chefs or interested clients on the public website. This is a simple, one-way contact form (NOT a chat system or ticketing system).

---

## Scope (V1)

### What's Included
- Single inquiry form at `/inquire`
- Form validation (client + server)
- Database insert into `inquiries` table (if table exists)
- Success confirmation screen
- Error handling
- Spam protection (honeypot + rate limiting)
- Idempotency (prevent duplicate submissions)

### What's Excluded (V1)
- Email notifications (no confirmation email to submitter)
- Auto-response messages
- Inquiry tracking/status updates
- Inquiry assignment to specific chefs
- Integration with CRM (Salesforce, HubSpot)

---

## Data Flow

```
User visits /inquire
  ↓
Fill out form (name, email, message, etc.)
  ↓
Client-side validation (Zod schema)
  ↓
Submit form (POST to /api/inquire or Server Action)
  ↓
Server-side validation
  ↓
Spam check (honeypot field)
  ↓
Rate limit check (3 per hour per IP)
  ↓
Idempotency check (5-minute window)
  ↓
Insert into inquiries table
  ↓
Return success response
  ↓
Redirect to confirmation screen
```

---

## Database Table (If Exists)

```sql
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  event_date TIMESTAMPTZ,
  guest_count INTEGER,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

**Note**: This table is OPTIONAL in V1. If it doesn't exist, inquiries can be logged to console or sent to external service (e.g., Slack webhook, email).

---

## Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Name | Text | Yes | Min 1 char, max 100 chars |
| Email | Email | Yes | Valid email format |
| Phone | Tel | No | Max 20 chars |
| Event Date | Date | No | Valid date in future |
| Guest Count | Number | No | Min 1, max 1000 |
| Message | Textarea | Yes | Min 10 chars, max 1000 chars |
| Website (honeypot) | Text | No (hidden) | Must be empty |

---

## Security Features

### 1. CSRF Protection
- Server Actions: Automatic CSRF tokens (Next.js)
- API Routes: Validate `Origin` header

### 2. Input Sanitization
- Strip HTML tags from all text inputs
- Validate email format (client + server)
- Escape special characters

### 3. Rate Limiting
- Max 3 submissions per IP per hour
- Returns 429 Too Many Requests if exceeded

### 4. Honeypot Field
- Hidden input field `website`
- If filled by bot, silently reject submission
- Return fake success to avoid revealing detection

### 5. Idempotency
- Hash submission data (email + message)
- If duplicate within 5 minutes, return cached response
- Prevents accidental double-submit

---

## Success Flow

1. User submits valid form
2. Server inserts into database
3. Server returns success response
4. Client redirects to `/inquire/success` (or shows inline success message)
5. User sees confirmation: "Thank you! We'll be in touch soon."

---

## Error Handling

### Invalid Email
- **Message**: "Please enter a valid email address"
- **Action**: Show inline error, keep form data, allow retry

### Missing Required Fields
- **Message**: "This field is required"
- **Action**: HTML5 validation (browser default)

### Rate Limit Exceeded
- **Message**: "You've submitted too many inquiries. Please try again in an hour."
- **Action**: Show inline error, disable submit button

### Network Error
- **Message**: "Unable to submit. Please check your connection and try again."
- **Action**: Show inline error, allow retry

---

## Related Documents

- [PUBLIC_INQUIRY_FORM_SCHEMA.md](./PUBLIC_INQUIRY_FORM_SCHEMA.md)
- [PUBLIC_INQUIRY_VALIDATION_RULES.md](./PUBLIC_INQUIRY_VALIDATION_RULES.md)
- [PUBLIC_INQUIRY_SPAM_PROTECTION.md](./PUBLIC_INQUIRY_SPAM_PROTECTION.md)

---

**Status**: Inquiry system overview is LOCKED for V1.
