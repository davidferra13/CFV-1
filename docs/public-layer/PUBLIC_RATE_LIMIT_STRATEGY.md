# Public Layer - Rate Limit Strategy

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Rate Limits

### Inquiry Submissions
- **Limit**: 3 per hour per IP
- **Window**: Rolling 1-hour
- **Response**: 429 Too Many Requests

### Signin Attempts
- **Limit**: 5 failed attempts per email
- **Window**: 5 minutes
- **Implementation**: Supabase Auth (automatic)

### Signup Attempts
- **Limit**: 10 per hour per IP
- **Implementation**: Supabase Auth (automatic)

---

**Status**: LOCKED for V1.
