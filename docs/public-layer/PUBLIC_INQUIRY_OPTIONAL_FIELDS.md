# Public Layer - Inquiry Optional Fields

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Optional Fields (Can Be Empty)

### 1. Phone
- **Purpose**: Alternative contact method
- **Format**: Flexible (no strict validation)
- **Max Length**: 20 characters

### 2. Event Date
- **Purpose**: Helps qualify lead (when they want service)
- **Format**: ISO 8601 datetime
- **Validation**: Must be future date if provided

### 3. Guest Count
- **Purpose**: Helps qualify lead (event size)
- **Range**: 1-1000
- **Validation**: Integer only

### 4. Website (Honeypot)
- **Purpose**: Spam detection
- **Expected**: EMPTY (if filled, reject as bot)
- **Not Stored**: Never saved to database

---

**Rationale for Optional Fields**:
- Reduces friction (faster form submission)
- Some inquiries are exploratory (no specific event yet)
- Can be collected later in follow-up

---

**Status**: Optional fields are LOCKED for V1.
