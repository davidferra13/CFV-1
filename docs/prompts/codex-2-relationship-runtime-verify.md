# Codex Task: Runtime Verify Relationship Page

Defensive error handling was applied to `/clients/[id]/relationship` in commit `66b5d2149`. This task verifies the page actually loads at runtime.

## Steps

### 1. Build the production app

```bash
npx next build --no-lint
```

If build fails, report the error and stop. Do not proceed.

### 2. Start the production server

```bash
npx next start -p 3000
```

Wait until you see "Ready" in the output.

### 3. Authenticate as agent

```bash
curl -X POST http://localhost:3000/api/e2e/auth \
  -H "Content-Type: application/json" \
  -d @.auth/agent.json
```

Save the session cookie from the response.

### 4. Find a client ID

```bash
curl -b <cookie> http://localhost:3000/api/clients?limit=1
```

Or query the database directly:

```sql
SELECT id FROM clients LIMIT 1;
```

### 5. Hit the relationship page

```bash
curl -b <cookie> -o /dev/null -w "%{http_code}" http://localhost:3000/clients/<client_id>/relationship
```

### 6. Report result

- If HTTP 200: Page loads. Relationship page fix is verified. Commit a one-line update to `docs/build-state.md` noting "relationship page verified at runtime 2026-04-24".
- If HTTP 500: Read the server console output. The actual error message is the root cause. Report it exactly as printed. Do NOT guess at fixes.
- If HTTP 404: The client has no data. Try a different client ID.

## Rules

- Do NOT modify any source code in this task
- Only modify `docs/build-state.md` if the page loads successfully
- Port 3000 is sacred (CLAUDE.md rule). Kill nothing on port 3000 unless you started it yourself.
- If the build fails, that is a blocker. Report it and stop.
