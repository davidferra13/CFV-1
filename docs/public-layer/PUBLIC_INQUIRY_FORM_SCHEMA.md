# Public Layer - Inquiry Form Schema

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

Defines the exact data schema for the inquiry form, including TypeScript types, Zod validation schemas, and database column mappings.

---

## TypeScript Types

```typescript
// types/inquiry.ts
export interface InquiryFormData {
  name: string;
  email: string;
  phone?: string;
  eventDate?: string; // ISO 8601 date string
  guestCount?: number;
  message: string;
  website?: string; // Honeypot field (should be empty)
}

export interface InquiryRecord extends InquiryFormData {
  id: string; // UUID
  createdAt: Date;
}
```

---

## Zod Validation Schema

### Client-Side and Server-Side Schema

```typescript
// lib/validations/inquiry.ts
import { z } from 'zod';

export const inquirySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),

  email: z
    .string()
    .email('Please enter a valid email address')
    .max(255, 'Email is too long')
    .trim()
    .toLowerCase(),

  phone: z
    .string()
    .max(20, 'Phone number is too long')
    .optional()
    .nullable()
    .transform(val => val || null),

  eventDate: z
    .string()
    .datetime('Invalid date format')
    .optional()
    .nullable()
    .refine(
      (date) => {
        if (!date) return true;
        return new Date(date) > new Date();
      },
      { message: 'Event date must be in the future' }
    ),

  guestCount: z
    .number()
    .int('Guest count must be a whole number')
    .min(1, 'Guest count must be at least 1')
    .max(1000, 'Guest count cannot exceed 1000')
    .optional()
    .nullable(),

  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message must be less than 1000 characters')
    .trim(),

  // Honeypot field - should always be empty
  website: z
    .string()
    .optional()
    .refine(val => !val || val.length === 0, {
      message: 'Invalid submission',
    }),
});

export type InquirySchemaType = z.infer<typeof inquirySchema>;
```

---

## Database Schema

```sql
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,

  -- Event details (optional)
  event_date TIMESTAMPTZ,
  guest_count INTEGER CHECK (guest_count > 0 AND guest_count <= 1000),

  -- Message
  message TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  ip_address TEXT, -- For rate limiting (optional)
  user_agent TEXT  -- For analytics (optional)
);

-- Indexes
CREATE INDEX idx_inquiries_email ON inquiries(email);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at DESC);
CREATE INDEX idx_inquiries_ip_address ON inquiries(ip_address, created_at)
  WHERE ip_address IS NOT NULL;
```

---

## Field-Level Specifications

### Name Field

**Type**: `string`
**Required**: Yes
**Validation**:
- Minimum length: 1 character
- Maximum length: 100 characters
- Auto-trimmed (whitespace removed from start/end)
- HTML tags stripped for security

**Database Column**: `name TEXT NOT NULL`

**Example Valid Values**:
- "John Smith"
- "María García"
- "Chef's Table LLC"

**Example Invalid Values**:
- "" (empty)
- "A" repeated 101 times (too long)

---

### Email Field

**Type**: `string (email)`
**Required**: Yes
**Validation**:
- Valid email format (RFC 5322 compliant)
- Maximum length: 255 characters
- Auto-trimmed
- Auto-lowercased
- HTML tags stripped

**Database Column**: `email TEXT NOT NULL`

**Example Valid Values**:
- "john@example.com"
- "chef+business@domain.co.uk"
- "user123@subdomain.example.org"

**Example Invalid Values**:
- "notanemail" (no @ symbol)
- "user@" (no domain)
- "@example.com" (no local part)

---

### Phone Field

**Type**: `string`
**Required**: No
**Validation**:
- Maximum length: 20 characters
- Optional (can be null or empty)
- No format validation (international phones vary)
- Auto-trimmed

**Database Column**: `phone TEXT`

**Example Valid Values**:
- "(555) 123-4567"
- "+1-555-123-4567"
- "555.123.4567"
- "" (empty, optional)

**Note**: No strict format validation to accommodate international phone numbers.

---

### Event Date Field

**Type**: `string (ISO 8601 datetime)`
**Required**: No
**Validation**:
- Valid ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Must be a future date (not in the past)
- Optional (can be null)

**Database Column**: `event_date TIMESTAMPTZ`

**Example Valid Values**:
- "2026-03-15T18:00:00.000Z"
- "2026-12-31T23:59:59.000Z"
- null (no date specified)

**Example Invalid Values**:
- "2020-01-01T00:00:00.000Z" (past date)
- "2026-03-15" (missing time component)
- "not a date" (invalid format)

---

### Guest Count Field

**Type**: `number (integer)`
**Required**: No
**Validation**:
- Must be a positive integer
- Minimum: 1
- Maximum: 1000
- Optional (can be null)

**Database Column**: `guest_count INTEGER CHECK (guest_count > 0 AND guest_count <= 1000)`

**Example Valid Values**:
- 1
- 50
- 500
- null (no guest count specified)

**Example Invalid Values**:
- 0 (too low)
- 1001 (too high)
- 25.5 (not an integer)
- -10 (negative)

---

### Message Field

**Type**: `string (textarea)`
**Required**: Yes
**Validation**:
- Minimum length: 10 characters
- Maximum length: 1000 characters
- Auto-trimmed
- HTML tags stripped for security
- Newlines preserved

**Database Column**: `message TEXT NOT NULL`

**Example Valid Values**:
- "I'm interested in booking a private dinner for 10 guests on March 15th."
- "Looking for a chef for weekly meal prep. Please contact me to discuss options and pricing."

**Example Invalid Values**:
- "Hi" (too short, <10 characters)
- A 1001-character message (too long)

---

### Website Field (Honeypot)

**Type**: `string (hidden)`
**Required**: No (should be empty)
**Validation**:
- MUST be empty or undefined
- If filled, submission is rejected (bot detected)
- Not stored in database

**Example Valid Values**:
- "" (empty)
- undefined
- null

**Example Invalid Values**:
- "http://spam.com" (bot filled it)
- "anything" (bot filled it)

**Security Note**: This field is hidden from users via CSS. Legitimate users won't see or fill it. Bots often auto-fill all fields, revealing themselves.

---

## HTML Form Schema

```tsx
<form action={submitInquiry}>
  <input
    type="text"
    name="name"
    placeholder="Your Name"
    required
    maxLength={100}
  />

  <input
    type="email"
    name="email"
    placeholder="you@example.com"
    required
    maxLength={255}
  />

  <input
    type="tel"
    name="phone"
    placeholder="(555) 123-4567"
    maxLength={20}
  />

  <input
    type="datetime-local"
    name="eventDate"
  />

  <input
    type="number"
    name="guestCount"
    min={1}
    max={1000}
  />

  <textarea
    name="message"
    placeholder="Tell us about your event..."
    required
    minLength={10}
    maxLength={1000}
    rows={5}
  />

  {/* Honeypot field (hidden from view) */}
  <input
    type="text"
    name="website"
    tabIndex={-1}
    autoComplete="off"
    style={{ position: 'absolute', left: '-9999px' }}
  />

  <button type="submit">Send Inquiry</button>
</form>
```

---

## Validation Error Messages

```typescript
export const inquiryErrorMessages = {
  name: {
    required: 'Please enter your name',
    tooLong: 'Name must be less than 100 characters',
  },
  email: {
    required: 'Please enter your email address',
    invalid: 'Please enter a valid email address',
    tooLong: 'Email is too long',
  },
  phone: {
    tooLong: 'Phone number is too long',
  },
  eventDate: {
    invalid: 'Please enter a valid date',
    past: 'Event date must be in the future',
  },
  guestCount: {
    min: 'Guest count must be at least 1',
    max: 'Guest count cannot exceed 1000',
    invalid: 'Guest count must be a whole number',
  },
  message: {
    required: 'Please enter a message',
    tooShort: 'Message must be at least 10 characters',
    tooLong: 'Message must be less than 1000 characters',
  },
};
```

---

## Server-Side Sanitization

```typescript
function sanitizeInquiry(data: InquirySchemaType): InquirySchemaType {
  return {
    name: sanitizeString(data.name),
    email: data.email.toLowerCase().trim(),
    phone: data.phone ? sanitizeString(data.phone) : null,
    eventDate: data.eventDate || null,
    guestCount: data.guestCount || null,
    message: sanitizeString(data.message),
    website: data.website || '',
  };
}

function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .trim();
}
```

---

## Testing Validation

```typescript
// Valid inquiry
const validInquiry: InquirySchemaType = {
  name: 'John Smith',
  email: 'john@example.com',
  phone: '(555) 123-4567',
  eventDate: '2026-03-15T18:00:00.000Z',
  guestCount: 50,
  message: 'I would like to book a private dinner for my anniversary.',
  website: '', // Empty (correct)
};

const result = inquirySchema.safeParse(validInquiry);
console.log(result.success); // true

// Invalid inquiry (email)
const invalidInquiry = {
  ...validInquiry,
  email: 'not-an-email',
};

const result2 = inquirySchema.safeParse(invalidInquiry);
console.log(result2.success); // false
console.log(result2.error.errors[0].message); // "Please enter a valid email address"
```

---

## Migration SQL

```sql
-- V1 migration: Create inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  event_date TIMESTAMPTZ,
  guest_count INTEGER CHECK (guest_count > 0 AND guest_count <= 1000),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_inquiries_email ON inquiries(email);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at DESC);

COMMENT ON TABLE inquiries IS 'Contact form submissions from public website';
COMMENT ON COLUMN inquiries.event_date IS 'Optional: When the user wants to book an event';
COMMENT ON COLUMN inquiries.guest_count IS 'Optional: How many guests they expect';
```

---

## Verification Checklist

Before deploying inquiry form:

- [ ] Zod schema validates all fields correctly
- [ ] Required fields enforce presence
- [ ] Email validation accepts valid formats
- [ ] Email validation rejects invalid formats
- [ ] Phone field is optional (accepts empty)
- [ ] Event date validates future dates only
- [ ] Guest count enforces min/max bounds
- [ ] Message enforces character limits
- [ ] Honeypot field detection works
- [ ] HTML tags are stripped from inputs
- [ ] Database constraints match validation rules
- [ ] TypeScript types match Zod schema

---

**Status**: This inquiry form schema is LOCKED for V1.
