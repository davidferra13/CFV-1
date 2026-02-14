# Public Layer - Inquiry Validation Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

Defines comprehensive validation rules for inquiry form submissions, enforced at both client-side and server-side layers.

---

## Multi-Layer Validation Strategy

### Layer 1: HTML5 Validation
- Browser-native validation
- Instant feedback (before form submission)
- Basic checks: required, email format, min/max length

### Layer 2: Client-Side JavaScript Validation
- Zod schema validation
- Custom validation logic
- Runs before Server Action call

### Layer 3: Server-Side Validation
- Zod schema validation (re-check)
- Security validations (honeypot, rate limit)
- Final gate before database insert

---

## Field Validation Rules

### Name Field

**Rule 1: Required**
- Value MUST NOT be empty
- Whitespace-only values are invalid

**Rule 2: Length**
- Minimum: 1 character
- Maximum: 100 characters

**Rule 3: Format**
- No format restrictions (allows international characters)
- HTML tags MUST be stripped

**Implementation**:
```typescript
z.string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .trim()
```

---

### Email Field

**Rule 1: Required**
- Value MUST NOT be empty

**Rule 2: Format**
- MUST match email regex pattern
- Local part + @ + domain
- Example: `user@example.com`

**Rule 3: Length**
- Maximum: 255 characters

**Rule 4: Normalization**
- Auto-trimmed
- Auto-lowercased

**Implementation**:
```typescript
z.string()
  .email('Please enter a valid email address')
  .max(255, 'Email is too long')
  .trim()
  .toLowerCase()
```

**Valid Examples**:
- `john@example.com`
- `chef+business@domain.co.uk`
- `user_123@sub.domain.org`

**Invalid Examples**:
- `notanemail` (no @ symbol)
- `@example.com` (no local part)
- `user@` (no domain)

---

### Phone Field

**Rule 1: Optional**
- Value CAN be empty or null

**Rule 2: Length**
- Maximum: 20 characters (if provided)

**Rule 3: Format**
- NO strict format validation
- Allows: `(555) 123-4567`, `+1-555-123-4567`, `555.123.4567`
- Rationale: International phone formats vary widely

**Implementation**:
```typescript
z.string()
  .max(20, 'Phone number is too long')
  .optional()
  .nullable()
```

---

### Event Date Field

**Rule 1: Optional**
- Value CAN be empty or null

**Rule 2: Format**
- MUST be valid ISO 8601 datetime string
- Example: `2026-03-15T18:00:00.000Z`

**Rule 3: Future Date**
- Date MUST be in the future (not past)

**Implementation**:
```typescript
z.string()
  .datetime('Invalid date format')
  .optional()
  .nullable()
  .refine(
    (date) => {
      if (!date) return true;
      return new Date(date) > new Date();
    },
    { message: 'Event date must be in the future' }
  )
```

---

### Guest Count Field

**Rule 1: Optional**
- Value CAN be empty or null

**Rule 2: Type**
- MUST be an integer (no decimals)

**Rule 3: Range**
- Minimum: 1
- Maximum: 1000

**Implementation**:
```typescript
z.number()
  .int('Guest count must be a whole number')
  .min(1, 'Guest count must be at least 1')
  .max(1000, 'Guest count cannot exceed 1000')
  .optional()
  .nullable()
```

---

### Message Field

**Rule 1: Required**
- Value MUST NOT be empty

**Rule 2: Length**
- Minimum: 10 characters
- Maximum: 1000 characters

**Rule 3: Format**
- HTML tags MUST be stripped
- Newlines preserved

**Implementation**:
```typescript
z.string()
  .min(10, 'Message must be at least 10 characters')
  .max(1000, 'Message must be less than 1000 characters')
  .trim()
```

---

### Website Field (Honeypot)

**Rule 1: MUST be empty**
- If value is NOT empty, reject submission (bot detected)

**Rule 2: NOT stored in database**
- This field is never persisted

**Implementation**:
```typescript
z.string()
  .optional()
  .refine(val => !val || val.length === 0, {
    message: 'Invalid submission',
  })
```

---

## Validation Timing

### Client-Side (Immediate)
```tsx
'use client';
import { useState } from 'react';
import { inquirySchema } from '@/lib/validations/inquiry';

export function InquiryForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleBlur(field: string, value: any) {
    try {
      inquirySchema.shape[field].parse(value);
      setErrors(prev => ({ ...prev, [field]: '' }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors(prev => ({
          ...prev,
          [field]: err.errors[0].message,
        }));
      }
    }
  }

  return (
    <form>
      <input
        name="email"
        onBlur={(e) => handleBlur('email', e.target.value)}
      />
      {errors.email && <p className="error">{errors.email}</p>}
    </form>
  );
}
```

### Server-Side (Before Insert)
```typescript
'use server';
import { inquirySchema } from '@/lib/validations/inquiry';

export async function submitInquiry(formData: FormData) {
  const rawData = {
    name: formData.get('name'),
    email: formData.get('email'),
    // ... other fields
  };

  // Validate
  const validated = inquirySchema.safeParse(rawData);

  if (!validated.success) {
    return {
      error: validated.error.errors[0].message,
    };
  }

  // Proceed with insert...
}
```

---

## Cross-Field Validation

### None Required in V1

All validations are field-level (no dependencies between fields).

**V1.1 Consideration**:
If business logic requires, add cross-field rules (e.g., "if guest count > 50, event date is required").

---

## Validation Error Display

### Inline Errors (Preferred)
```tsx
<div className="field">
  <label>Email</label>
  <input name="email" className={errors.email ? 'error' : ''} />
  {errors.email && (
    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
  )}
</div>
```

### Summary Errors (Alternative)
```tsx
{Object.keys(errors).length > 0 && (
  <div className="error-summary">
    <h3>Please fix the following errors:</h3>
    <ul>
      {Object.values(errors).map((error, i) => (
        <li key={i}>{error}</li>
      ))}
    </ul>
  </div>
)}
```

---

## Sanitization (Post-Validation)

After validation passes, sanitize inputs:

```typescript
function sanitizeInquiry(data: InquirySchemaType): InquirySchemaType {
  return {
    ...data,
    name: stripHtml(data.name),
    message: stripHtml(data.message),
    phone: data.phone ? stripHtml(data.phone) : null,
  };
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}
```

---

## Testing Validation Rules

```typescript
describe('Inquiry Validation', () => {
  it('rejects empty name', () => {
    const result = inquirySchema.safeParse({
      name: '',
      email: 'test@example.com',
      message: 'Valid message here',
    });

    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toBe('Name is required');
  });

  it('rejects invalid email', () => {
    const result = inquirySchema.safeParse({
      name: 'John',
      email: 'not-an-email',
      message: 'Valid message',
    });

    expect(result.success).toBe(false);
    expect(result.error.errors[0].path).toContain('email');
  });

  it('accepts valid inquiry', () => {
    const result = inquirySchema.safeParse({
      name: 'John Smith',
      email: 'john@example.com',
      message: 'I would like to inquire about your services.',
    });

    expect(result.success).toBe(true);
  });

  it('rejects past event date', () => {
    const result = inquirySchema.safeParse({
      name: 'John',
      email: 'john@example.com',
      message: 'Valid message',
      eventDate: '2020-01-01T00:00:00.000Z', // Past
    });

    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toBe('Event date must be in the future');
  });
});
```

---

## Verification Checklist

- [ ] All required fields enforce presence
- [ ] Email validation accepts valid formats
- [ ] Email validation rejects invalid formats
- [ ] Phone field accepts empty (optional)
- [ ] Event date rejects past dates
- [ ] Guest count enforces min/max
- [ ] Message enforces character limits
- [ ] Honeypot field rejects non-empty values
- [ ] HTML tags are stripped from inputs
- [ ] Client-side validation matches server-side
- [ ] Error messages are user-friendly

---

**Status**: These validation rules are LOCKED for V1.
