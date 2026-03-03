# ChefFlow Overnight Audit Variant

## Problem: Overfitting to One Test

After running the same audit 10+ times, a system can become optimized specifically for that test, not for genuine quality improvement. We need **multiple test variants** to verify that improvements are real and generalizable.

## Solution: Audit Variant Strategy

Run **two different audit tests** on a rotation:

### Main Audit (`npm run audit:overnight`)

- Standard configuration
- Sequential crawl order
- WCAG 2.1 Level AA accessibility
- Admin-level auth
- Normal network conditions
- ~3h runtime

**Good for:** Consistent baseline, regression detection

### Variant Audit (`npm run audit:variant`)

Runs 5 different test configurations in parallel to catch different types of issues:

#### 1. **RANDOMIZED_CRAWL**

- Routes tested in random order
- Tests if crawl sequence affects results
- Catches timing/order-dependent issues
- Timeout: 45s per page (faster than main audit)

#### 2. **WCAG3_STRICT**

- WCAG 3.0 Level AAA standards (highest bar)
- Custom accessibility rules
- Routes in reverse alphabetical order
- Catches subtle A11y violations main audit misses

#### 3. **LINK_STRICT**

- Strict link validation (relative URLs, fragments, redirects)
- Simulates bot link crawlers
- Detects broken internal/external links aggressively
- Catches SEO and navigation issues

#### 4. **LOW_AUTH**

- Client-level privileges (reduced access)
- Tests permission boundaries
- Only accessible client routes tested
- Catches unauthorized access vulnerabilities

#### 5. **SLOW_NETWORK**

- 3G network throttling simulation
- Tests performance under poor conditions
- 90s timeout (slow loads)
- Catches performance regressions invisible on fast networks

**Runtime:** ~5-8 minutes total (all 5 configs)

## Usage

```bash
# Run standard overnight audit
npm run audit:overnight

# Run variant audit (tests 5 different configurations)
npm run audit:variant

# Run both (comprehensive evaluation)
npm run audit:overnight && npm run audit:variant
```

## Interpreting Results

### If Results Are Similar Across All Tests

✅ **System improvements are GENUINE**

The same issues appear in the main audit and all variants, indicating root cause fixes, not test-specific optimizations.

### If Results Differ Between Tests

⚠️ **Investigate which variants expose different issues**

| If variant finds more issues | It means                                                           |
| ---------------------------- | ------------------------------------------------------------------ |
| RANDOMIZED_CRAWL             | Order/timing matters; possible race conditions                     |
| WCAG3_STRICT                 | Missing subtle accessibility issues; add Level AAA checks          |
| LINK_STRICT                  | Broken links not caught by standard crawl; improve link validation |
| LOW_AUTH                     | Permission boundary issues; security risk                          |
| SLOW_NETWORK                 | Performance problems under load; optimize critical paths           |

### Recommended Rotation

To prevent overfitting:

**Week 1:** Run main audit 5 times, then variant audit
**Week 2:** Run variant audit 5 times, then main audit
**Week 3+:** Alternate weekly

This ensures the system is genuinely robust, not just good at one specific test.

## Architecture

The variant audit is self-contained in `scripts/overnight-audit-variant.mjs` and:

1. Spawns 5 test configs with different parameters
2. Collects metrics: dead links, A11y issues, console errors
3. Generates comparison report in `reports/overnight-variant-YYYY-MM-DD/`
4. Outputs summary showing which config found which issues

## Future Enhancements

- **Randomized seeds:** Each run uses different test data
- **Mutation testing:** Introduce intentional bugs to verify detection
- **Baseline comparison:** Auto-compare variant vs main audit
- **Trend analysis:** Track which variants find regressions first
- **CI/CD integration:** Run variant audit on feature branches before merge

## Philosophy

> **Formula > AI, Deterministic > Random, Multiple Views > Single View**

A system that passes the same test perfectly but fails a different test hasn't solved the problem—it's just overfit. True quality comes from **diverse, adversarial testing** that forces genuine robustness.
