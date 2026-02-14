# Public Layer - API Endpoint Protection

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## API Endpoints

### `/api/inquire` (POST)
- **Protection**: CSRF (Origin header check)
- **Rate Limiting**: 3/hour/IP
- **Validation**: Zod schema
- **Sanitization**: Strip HTML

---

## Protection Checklist

- [ ] CSRF protection enabled
- [ ] Input validation (Zod)
- [ ] Input sanitization
- [ ] Rate limiting
- [ ] Error handling (no info leakage)

---

**Status**: LOCKED for V1.
