# Public Layer - Verification Checklist

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Pre-Deployment Verification

### Functional
- [ ] All routes render correctly (9 routes)
- [ ] Navigation links work (header + footer)
- [ ] Inquiry form submits successfully
- [ ] Chef signup creates user + role + redirects
- [ ] Client signup (invitation) works end-to-end
- [ ] Signin redirects to correct portal
- [ ] Middleware prevents double-access to auth pages

### Security
- [ ] CSRF protection enabled
- [ ] Input sanitization works
- [ ] Rate limiting blocks excess submissions
- [ ] Honeypot catches bots
- [ ] No service role key in client bundles
- [ ] RLS policies block unauthorized access

### Performance
- [ ] Lighthouse Performance score ≥90
- [ ] FCP <1.5s (desktop), <2s (mobile)
- [ ] LCP <2.5s (desktop), <3s (mobile)
- [ ] CLS <0.1
- [ ] Total page size <500 KB

### Accessibility
- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Color contrast ≥4.5:1

### SEO
- [ ] All pages have meta tags
- [ ] Canonical URLs set
- [ ] Images have alt text
- [ ] Semantic HTML structure

---

**Status**: Must pass ALL checks before V1 launch.
