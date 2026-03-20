# Function Evaluation Surface

A complete mental model for designing, building, and auditing functions. Every function should be evaluated across all 10 dimensions before it's considered production-ready.

---

## The 10 Dimensions

### 1. Purpose

What the function does. The single sentence that justifies its existence.

### 2. Configuration (Inputs)

Parameters, settings, defaults. What you pass in to control behavior.

### 3. Output Contract

What it returns, in what shape, under what conditions:

- **Success shape**: the happy-path return type
- **Failure shape**: does it throw? Return null? Return an error object?
- **Side effects**: does it mutate state, write to DB, send a notification?

Most bugs live here. Ambiguous output poisons everything downstream.

### 4. Boundary Conditions

What happens at the edges:

- Empty, null, or undefined inputs
- Zero, negative, or maximum values
- Concurrent calls
- First call vs. subsequent calls

If you only test the happy path, you only know half the function.

### 5. Authorization and Tenancy

Who is allowed to call this, and whose data does it touch:

- Does it verify the caller's identity?
- Does it scope to a tenant or user?
- Can it leak data across boundaries?

Rule: tenant_id comes from the session, never from the request body.

### 6. Failure Mode

Not "does it handle errors" but "how does it fail, and who knows about it":

- **Fatal vs. recoverable**: does failure stop the operation or degrade gracefully?
- **Visibility**: does the caller see the failure? The user? Monitoring?
- **Blast radius**: if this fails, what else breaks?

Non-blocking side effects (notifications, emails, logs) should never take down the main operation.

### 7. Performance Characteristics

Not premature optimization, just awareness:

- Does it hit the network? How many times?
- Does it scale linearly with input size, or worse?
- Does it block the UI or thread?
- Is it called once or in a loop?

### 8. Idempotency and Determinism

If called twice with the same inputs:

- Do you get the same result?
- Does it create duplicate side effects (double charges, duplicate rows)?
- Is that intentional?

### 9. Cache and Staleness

If the result is cached or memoized:

- What invalidates it?
- Can it serve stale data?
- Who busts the cache when the underlying data changes?

Every `unstable_cache` tag needs matching `revalidateTag` calls in all relevant mutations.

### 10. Observability

When something goes wrong in production:

- Can you tell this function was involved?
- Does it log enough to diagnose, but not so much it leaks PII?
- Can you trace a user complaint back to a specific call?

---

## The Three Layers

```
Layer 1: WHAT        -> Purpose + Inputs + Output Contract
Layer 2: WHAT IF     -> Boundaries + Failure Mode + Idempotency
Layer 3: IN CONTEXT  -> Auth + Performance + Cache + Observability
```

**Layer 1** is what most people write. It works on the happy path.

**Layer 2** is what makes it production-safe. It survives real users doing unexpected things.

**Layer 3** is what makes it production-ready. It survives operating in a real system with real load, real concurrency, and real debugging needs.

---

## Quick Audit Checklist

When building or reviewing a function, check each box:

- [ ] Purpose is a single clear sentence
- [ ] Inputs have types, defaults, and validation at system boundaries
- [ ] Output contract is explicit (success shape, failure shape, side effects)
- [ ] Edge cases are handled (nulls, empties, extremes, concurrency)
- [ ] Authorization is enforced (caller identity, tenant scoping)
- [ ] Failure mode is defined (fatal vs. recoverable, visibility, blast radius)
- [ ] Performance is understood (network calls, scaling, blocking)
- [ ] Idempotency is intentional (safe to retry, or guarded against duplicates)
- [ ] Cache invalidation is wired (every write busts every relevant read cache)
- [ ] Observability exists (logs, traces, no PII leaks)

---

## Rule of Thumb

Purpose + Configuration alone covers roughly 30% of the surface. It's the equivalent of designing a car by specifying the engine and the steering wheel, then skipping brakes, seatbelts, and the dashboard.

The most common failure pattern: a function that does exactly what it says, but nobody defined what it does when things go wrong, so it silently returns garbage and the bug surfaces three layers away.
