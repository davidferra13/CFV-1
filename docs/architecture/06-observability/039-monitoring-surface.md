# Monitoring Surface

**Document ID**: 039
**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-02-14

---

## Purpose

Defines what is monitored in production and how to access monitoring data.

---

## Monitoring Points

### 1. Application Uptime

**Tool**: Vercel automatic health checks

**External**: UptimeRobot or Pingdom (recommended)

**Alert**: Email if down for > 5 minutes

---

### 2. API Response Times

**Tool**: Vercel Analytics

**Metrics**:
- p50, p95, p99 response times
- Error rate (5xx errors)

**Access**: Vercel Dashboard → Analytics

---

### 3. Database Performance

**Tool**: Supabase Dashboard → Database → Query Performance

**Metrics**:
- Slow queries (> 1 second)
- Connection pool usage
- RLS policy performance

---

### 4. Stripe Webhook Delivery

**Tool**: Stripe Dashboard → Webhooks → Events

**Metrics**:
- Success rate
- Failure count
- Response time

---

## V1 Limitations

**Not Monitored**:
- Custom metrics
- User session analytics
- Feature usage tracking
- A/B testing

**Post-V1**: Add Datadog or New Relic

---

## References

- **Error Boundary Model**: `037-error-boundary-model.md`
- **Logging Model**: `038-logging-model.md`
- **Production Environment**: `016-production-environment.md`
