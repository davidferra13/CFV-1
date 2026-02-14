# Logging Model

**Document ID**: 038
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines logging strategy for ChefFlow V1.

---

## Log Levels

### Development

```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info');
}
```

### Production

**Allowed**:
- `console.error()` for errors
- `console.warn()` for warnings

**Prohibited**:
- `console.log()` (too verbose)
- Logging sensitive data (passwords, tokens, API keys)

---

## Log Destinations

**Vercel**: Runtime logs (7 days retention on Pro plan)

**Supabase**: Database logs, auth logs (7 days retention)

---

## What to Log

**✅ Log**:
- Webhook processing (event type, status)
- Failed database queries
- Authentication failures
- Unexpected errors

**❌ Never Log**:
- Passwords
- API keys
- Card numbers
- Session tokens

---

## References

- **Error Boundary Model**: `037-error-boundary-model.md`
- **Monitoring Surface**: `039-monitoring-surface.md`
