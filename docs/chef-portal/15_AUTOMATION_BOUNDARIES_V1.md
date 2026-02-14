# Automation Boundaries (V1)

## V1 Automation Scope

### Allowed Automation

1. **Stripe webhook processing** → Ledger entries (system-triggered)
2. **Event status transitions** (via webhooks only, e.g., `deposit_pending` → `confirmed`)
3. **Email notifications** (triggered by explicit actions)

---

### Forbidden Automation

1. **Autonomous status changes** (chef must explicitly trigger transitions)
2. **Automatic pricing adjustments**
3. **Auto-acceptance of client responses**
4. **Predictive scheduling** (AI-suggested event times)
5. **Batch operations without explicit approval**

---

## No Background Jobs (V1)

V1 does NOT include:
- Scheduled cron jobs
- Background workers
- Automated reconciliation
- Data cleanup jobs

**Manual triggers only.**

---

## Future: Controlled Automation (V2+)

- Auto-transition `menu_locked` → `executed` after event date
- Email reminders (3 days before event)
- Cleanup of expired invites

---

**End of Automation Boundaries**
