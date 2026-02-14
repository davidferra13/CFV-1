# Contributing to ChefFlow V1

**Version**: 1.0
**Last Updated**: 2026-02-13

Guidelines for contributing to ChefFlow V1 codebase.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Code Standards](#code-standards)
5. [Commit Guidelines](#commit-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Scope Lock Compliance](#scope-lock-compliance)

---

## Code of Conduct

- Be respectful and constructive
- Follow the V1 scope lock (no feature expansion)
- Prioritize security and data integrity
- Write clear, maintainable code

---

## Getting Started

1. **Read documentation**:
   - [CHEFFLOW_V1_SCOPE_LOCK.md](./CHEFFLOW_V1_SCOPE_LOCK.md) - **REQUIRED**
   - [ARCHITECTURE.md](./ARCHITECTURE.md)
   - [DEVELOPMENT.md](./DEVELOPMENT.md)

2. **Setup local environment**: Follow [DEVELOPMENT.md](./DEVELOPMENT.md)

3. **Run verification scripts**: Ensure database is correct

---

## Development Workflow

### 1. Create Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/short-description
```

Branch naming:
- `feature/` - New features (within scope)
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring (no behavior change)

### 2. Make Changes

- Follow code standards (see below)
- Test locally
- Run verification scripts

### 3. Commit

```bash
git add .
git commit -m "Descriptive message"
```

See [Commit Guidelines](#commit-guidelines).

### 4. Push and Create PR

```bash
git push origin feature/short-description
```

Create Pull Request on GitHub.

---

## Code Standards

### TypeScript

- **Strict mode**: Enabled in `tsconfig.json`
- **No `any`**: Use proper types
- **Use type imports**: `import type { Type } from '...'`

**Example**:
```typescript
// Good
export async function createEvent(data: EventData): Promise<Result<Event>> {
  // ...
}

// Bad
export async function createEvent(data: any): Promise<any> {
  // ...
}
```

### Server Components First

Default to Server Components:

```typescript
// Good (Server Component)
export default async function Page() {
  const data = await fetchData()
  return <div>{data}</div>
}

// Only use client when needed
'use client'
export function InteractiveComponent() {
  const [state, setState] = useState()
  // ...
}
```

### Database Queries

Use Supabase client (no raw SQL):

```typescript
// Good
const { data, error } = await supabase
  .from('events')
  .select('*')
  .eq('tenant_id', tenantId)

// Avoid (unless complex query)
const { data } = await supabase.rpc('custom_function')
```

### Error Handling

Return structured errors:

```typescript
// Good
export async function createEvent(data: EventData): Promise<Result<Event>> {
  if (!data.title) {
    return { success: false, error: 'Title required' }
  }
  // ...
  return { success: true, data: event }
}

// Bad (throwing errors from server actions)
export async function createEvent(data: EventData) {
  if (!data.title) throw new Error('Title required')
}
```

### Security

- **Always verify permissions**: Use `requireChef()`, `requireClient()`
- **Never trust client input**: Validate server-side
- **Use RLS**: Don't rely on application logic alone

```typescript
// Good
export async function updateEvent(eventId: string, updates: EventUpdate) {
  const chef = await requireChef()

  const { data: event } = await supabase
    .from('events')
    .select('tenant_id')
    .eq('id', eventId)
    .single()

  if (event?.tenant_id !== chef.tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  // Proceed with update
}
```

---

## Commit Guidelines

### Format

```
<type>: <subject>

<body>

<footer>
```

### Types

- `feat`: New feature (within V1 scope)
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting (no code change)
- `refactor`: Code restructure (no behavior change)
- `test`: Add tests
- `chore`: Build/config updates

### Examples

**Good**:
```
fix: Prevent duplicate ledger entries on webhook retry

Add idempotency check before inserting ledger entry.
Returns success if stripe_event_id already exists.

Fixes #123
```

**Good** (short):
```
docs: Update RLS_POLICIES.md with client SELECT policy
```

**Bad**:
```
fixed stuff
```

---

## Pull Request Process

### 1. Create PR

- **Title**: Clear, descriptive
- **Description**: What changed and why
- **Link issue**: `Fixes #123` or `Closes #456`

### 2. PR Checklist

- [ ] Code follows style guidelines
- [ ] Tested locally
- [ ] No console.logs in production code
- [ ] Documentation updated (if needed)
- [ ] No new dependencies (unless approved)
- [ ] Within V1 scope (check SCOPE_LOCK.md)

### 3. Review

- Address feedback promptly
- Make requested changes
- Re-request review after updates

### 4. Merge

- **Squash and merge** (preferred)
- Delete branch after merge

---

## Scope Lock Compliance

**CRITICAL**: ChefFlow V1 has a **frozen scope**.

### Before Adding Features

1. Check [CHEFFLOW_V1_SCOPE_LOCK.md](./CHEFFLOW_V1_SCOPE_LOCK.md)
2. Is feature in "V1 Feature List"?
   - **YES**: Proceed
   - **NO**: Do NOT implement (see Scope Change Process)

### Scope Change Process

To add/remove features:

1. Document justification
2. Update SCOPE_LOCK.md with version bump
3. Get explicit approval
4. Log change in "Scope Change Log"

**Do NOT** add features without this process.

### Allowed Changes

- Bug fixes
- Performance improvements
- Documentation updates
- Refactoring (no behavior change)
- Test additions

### Prohibited Changes

- New features not in V1 scope
- Breaking API changes
- Tech stack changes
- Large refactors (file moves, route renaming)

---

## Testing Requirements

### Before PR

Run these tests:

1. **Manual flow test**:
   - Chef signup → create event → invite client
   - Client signup → accept → pay

2. **Database verification**:
   ```sql
   -- Run in Supabase SQL Editor
   \i scripts/verify-rls.sql
   \i scripts/verify-immutability.sql
   ```

3. **Build check**:
   ```bash
   npm run build
   ```

4. **Type check**:
   ```bash
   npm run type-check
   ```

### Future (Automated Tests)

Once test suite is added:

```bash
npm test
```

---

## File Organization

### Where to Put Code

```
lib/
├── auth/          # Authentication functions
├── events/        # Event CRUD and transitions
├── ledger/        # Financial functions
├── clients/       # Client management
├── menus/         # Menu management
└── supabase/      # DB client creation

app/
├── (chef)/        # Chef portal pages
├── (client)/      # Client portal pages
├── (public)/      # Public pages
├── api/           # API routes (webhooks)
└── actions/       # Shared server actions

components/        # Reusable UI components
types/            # TypeScript types
```

### Naming Conventions

- **Files**: kebab-case (`create-event.ts`)
- **Components**: PascalCase (`EventCard.tsx`)
- **Functions**: camelCase (`createEvent()`)
- **Types**: PascalCase (`EventData`)
- **Constants**: UPPER_CASE (`MAX_GUESTS`)

---

## Questions?

- **Scope questions**: Check CHEFFLOW_V1_SCOPE_LOCK.md
- **Technical questions**: Check ARCHITECTURE.md or ask in PR
- **Bug reports**: Create GitHub issue

---

**Last Updated**: 2026-02-13
**Maintained By**: ChefFlow V1 Team
