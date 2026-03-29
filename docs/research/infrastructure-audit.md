# Research: Infrastructure & Network Security Audit

> **Date:** 2026-03-29
> **Question:** What is the full infrastructure and network attack surface of ChefFlow, running on a Windows 11 machine exposed via Cloudflare Tunnel?
> **Status:** complete
> **Related:** `docs/research/attack-surface-audit.md` (application-layer audit), `docs/security-user-threat-model.md` (user/threat model)

## Summary

ChefFlow runs on a single Windows 11 machine in Haverhill, MA with four network services bound to `0.0.0.0` (all interfaces): Next.js dev (3100), Next.js prod (3000), Ollama (11434), and PostgreSQL via Docker (54322). Any device on the same WiFi network can reach all four services directly. Ollama has zero authentication and processes all private client data. Database credentials are `postgres:postgres`. Backups are unencrypted plaintext SQL stored locally. Email (Resend) sends from `info@cheflowhq.com`, but SPF/DKIM/DMARC status could not be confirmed via web search and requires manual verification. The Cloudflare Tunnel config is committed to the repo with a tunnel UUID.

---

## 1. Ollama Exposure (localhost:11434)

### FINDING 1.1: Ollama Has Zero Authentication and Binds to All Interfaces

- **Severity:** High
- **What's wrong:** Ollama's HTTP API runs on port 11434 with no authentication mechanism whatsoever. By default, Ollama binds to `127.0.0.1` (localhost only), but if the `OLLAMA_HOST` environment variable is set to `0.0.0.0` or if the Windows Firewall allows inbound connections to 11434, any device on the local network can reach it.
- **Risk:** Anyone on the same WiFi can:
  1. Query the loaded models (`GET /api/tags`)
  2. Run arbitrary prompts against any loaded model (`POST /api/chat`, `/api/generate`)
  3. Potentially extract cached conversation context if the model's `keep_alive` window is active (currently set to `30m` in `lib/ai/parse-ollama.ts:143`)
  4. Abuse the GPU/CPU for their own inference workloads (cryptomining via LLM is unlikely, but denial of service is trivial)
- **Evidence:** `lib/ai/parse-ollama.ts:124` creates the Ollama client with `new Ollama({ host: baseUrl })` where `baseUrl` defaults to `http://localhost:11434` (`lib/ai/providers.ts:24`). The connection is plain HTTP with no auth headers.

### FINDING 1.2: Sensitive Data Categories Sent to Ollama

- **Severity:** Informational (by design, but relevant if Ollama is network-exposed)
- **What's sent:** Based on the 81 files calling `parseWithOllama` (242 total call sites), the following private data flows through Ollama:

| Data Category                                               | Example Files                                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Client names, contact info, dietary restrictions, allergies | `lib/ai/parse-client.ts`, `lib/ai/client-preference-profile.ts`, `lib/ai/allergen-risk.ts`     |
| Event details, financials, quotes, pricing                  | `lib/ai/quote-draft.ts`, `lib/ai/pricing-intelligence.ts`, `lib/ai/aar-generator.ts`           |
| Recipe content (chef IP)                                    | `lib/ai/parse-recipe.ts`, `lib/ai/recipe-scaling.ts`                                           |
| Email content, conversation history                         | `lib/ai/remy-email-actions.ts`, `lib/ai/remy-conversation-actions.ts`, `lib/gmail/classify.ts` |
| Staff data, briefings                                       | `lib/ai/staff-briefing-ai.ts`, `lib/ai/agent-actions/staff-actions.ts`                         |
| Tax, financial call scripts                                 | `lib/ai/tax-deduction-identifier.ts`, `lib/ai/agent-actions/financial-call-actions.ts`         |
| Contracts with client PII                                   | `lib/ai/contract-generator.ts`                                                                 |
| Brain dumps (unstructured chef notes)                       | `lib/ai/parse-brain-dump.ts`                                                                   |
| Prospecting/lead data                                       | `lib/prospecting/pipeline-actions.ts`, `lib/prospecting/scrub-actions.ts`                      |

- **Impact if exposed:** If an attacker on the local network can reach Ollama, they cannot directly read past prompts. However, during the 30-minute `keep_alive` window, the model weights and KV cache are resident in memory. The practical extraction risk is low (KV cache is not directly queryable via the API), but an attacker could send targeted prompts that might cause the model to leak context from recent conversations if they share the same Ollama session context (unlikely with `format: 'json'` structured calls, but not impossible with creative prompting).

### Recommendation

- **Verify Ollama's bind address.** Run `netstat -an | findstr 11434` on the Windows machine. If it shows `0.0.0.0:11434`, it is exposed to the network.
- **If exposed:** Set `OLLAMA_HOST=127.0.0.1:11434` in Ollama's environment to restrict to localhost only.
- **Windows Firewall:** Create an inbound rule blocking port 11434 from non-localhost sources as defense in depth.

---

## 2. Cloudflare Tunnel Configuration

### FINDING 2.1: Tunnel Config Committed to Repo with UUID

- **Severity:** Low-Medium
- **File:** `.cloudflared/config.yml:16-17`
- **What's exposed:** The tunnel UUID (`f48ab139-b448-4fd9-a431-bcf6b09902f0`) and credentials file path (`C:\Users\david\.cloudflared\f48ab139-b448-4fd9-a431-bcf6b09902f0.json`) are committed to the repo.
- **Risk:** The UUID alone is not sufficient to hijack the tunnel (the credentials JSON file is required and is correctly NOT in the repo). However, the UUID leaks the tunnel identity, which could be used for targeted attacks if combined with other Cloudflare vulnerabilities.
- **Current config:** The tunnel routes `beta.cheflowhq.com` to `localhost:3100` (the dev server). The `noTLSVerify: true` setting disables TLS verification between cloudflared and the local server, which is expected for localhost but worth noting.

### FINDING 2.2: Production Tunnel Config Not Found in Repo

- **Severity:** Informational
- **What's missing:** The `.cloudflared/config.yml` only defines the `beta.cheflowhq.com` tunnel routing to port 3100. There is no config file in the repo for the production `app.cheflowhq.com` tunnel routing to port 3000. This tunnel is likely configured via Cloudflare's dashboard or a separate config outside the repo.
- **Risk:** Without seeing the production tunnel config, it cannot be confirmed whether it has additional access controls (e.g., Cloudflare Access policies, IP restrictions).

### FINDING 2.3: Local Network Can Bypass the Tunnel

- **Severity:** Medium
- **What's wrong:** The Cloudflare Tunnel provides external access control, but all Next.js servers bind to `0.0.0.0` (see Finding 3.1). Anyone on the local WiFi network can hit `http://<machine-local-ip>:3000` or `:3100` directly, bypassing any Cloudflare security features (WAF, Access policies, bot detection, rate limiting).
- **Impact:** The tunnel is a security layer for external traffic. Local network traffic sees none of it.

---

## 3. Local Network Exposure

### FINDING 3.1: All Servers Bind to 0.0.0.0 (CRITICAL)

- **Severity:** Critical
- **File:** `package.json:6,15-17`
- **Evidence:**
  ```
  "dev": "next dev -p 3100 -H 0.0.0.0"
  "start": "next start -p 3000 -H 0.0.0.0"
  "prod": "node scripts/run-next-build.mjs && next start -p 3000 -H 0.0.0.0"
  "start:dev": "next dev -p 3100 -H 0.0.0.0"
  ```
- **What this means:** Every Next.js process listens on ALL network interfaces. Any device on the same WiFi network (or any network the machine is connected to) can access:
  - **Port 3000** - Production server (the real app serving real client data)
  - **Port 3100** - Dev server (same app, hot reload enabled, potentially more verbose error messages)
- **Why it was likely done:** To allow testing from other devices (phone, tablet) on the same network, or for the Cloudflare Tunnel to connect.
- **Risk:** A neighbor, a visitor on the WiFi, or any compromised IoT device on the network can access the full ChefFlow application directly.

### FINDING 3.2: Open Port Summary for Local Network Attackers

| Port  | Service      | Auth              | Encryption  | Risk if Reached                                                                           |
| ----- | ------------ | ----------------- | ----------- | ----------------------------------------------------------------------------------------- |
| 3000  | Next.js prod | Auth.js sessions  | None (HTTP) | Full app access if attacker can authenticate; SSE channels have no auth (see prior audit) |
| 3100  | Next.js dev  | Auth.js sessions  | None (HTTP) | Same as 3000, plus dev-mode error details, React dev tools support                        |
| 11434 | Ollama       | **None**          | None (HTTP) | Arbitrary model queries, GPU abuse, potential data extraction                             |
| 54322 | PostgreSQL   | postgres:postgres | None (TCP)  | **Full database access** - read/write/delete all data                                     |

### FINDING 3.3: Docker PostgreSQL Port Mapping Exposes to Network

- **Severity:** Critical (see section 5 for details)
- **File:** `docker-compose.yml:10`
- **Evidence:** `ports: - "54322:5432"` maps to all interfaces by default in Docker Desktop for Windows.

---

## 4. DNS / Domain Security

### FINDING 4.1: Email SPF/DKIM/DMARC Status - Unverified

- **Severity:** Unknown (requires manual check)
- **What we know:** Emails are sent from `info@cheflowhq.com` via Resend (`lib/email/resend-client.ts:19`). The sender name is `CheFlow` (intentional branding, per `CLAUDE.md`).
- **What could not be verified:** Web search could not retrieve the actual DNS TXT records for `cheflowhq.com`. The following must be checked manually using `nslookup -type=TXT cheflowhq.com` or MXToolbox:
  - **SPF record** - should include Resend's sending IPs (`include:amazonses.com` or Resend's specific include)
  - **DKIM record** - Resend provides a CNAME or TXT record for `resend._domainkey.cheflowhq.com`
  - **DMARC record** - should exist at `_dmarc.cheflowhq.com` with at minimum `v=DMARC1; p=quarantine`
- **Risk if missing:** Without DMARC, anyone can send emails that appear to come from `info@cheflowhq.com`. Clients could receive spoofed emails that look like legitimate ChefFlow communications (quote confirmations, payment requests, event details). This is a phishing goldmine for a food service business where money changes hands.

### FINDING 4.2: Lookalike Domains - Not Checked

- **Severity:** Informational
- **What was attempted:** Web search for registered lookalike domains of "cheflowhq" found no results.
- **Recommendation:** Run `dnstwist cheflowhq.com` locally (available via pip: `pip install dnstwist`) to generate and check all permutations. Key typos to watch: `cheffllowhq.com`, `cheflowhq.net`, `cheflowhq.co`, `chefflow.com`, `chefflowqh.com`.

---

## 5. Database Exposure

### FINDING 5.1: PostgreSQL with Default Credentials on Network-Accessible Port

- **Severity:** Critical
- **File:** `docker-compose.yml:10-14`
- **Evidence:**
  ```yaml
  ports:
    - '54322:5432'
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
  ```
- **What this means:** Docker Desktop for Windows maps port 54322 to all interfaces by default. The credentials are `postgres:postgres`. Any device on the local network can connect:
  ```
  psql -h <machine-ip> -p 54322 -U postgres -d postgres
  ```
- **Impact:** Complete database compromise. An attacker can:
  1. Read all client PII, financial data, recipes, contracts, emails
  2. Modify data (change payment status, alter quotes, forge ledger entries)
  3. Delete data (drop tables, truncate)
  4. Extract the full database as a dump
  5. Insert backdoor records (new admin user, new auth entry)
- **Mitigations available:**
  - Change the port mapping to `127.0.0.1:54322:5432` in `docker-compose.yml` to restrict to localhost
  - Change the password from `postgres` to something non-default
  - Docker Desktop network settings may already restrict this depending on the "Use WSL2 based engine" setting, but this should not be relied upon

### FINDING 5.2: Database Connection String Visible in Multiple Files

- **Severity:** Low (all gitignored or documentation)
- **Where:** `docker-compose.yml` (committed), `.env.local.example` (committed, shows template only), `CLAUDE.md` (committed, documents the connection string `postgresql://postgres:CHEF.jdgyuegf9924092.FLOW@127.0.0.1:54322/postgres`), `docs/local-database-setup.md` (committed).
- **Risk:** The credentials are default and well-known. The real risk is network exposure (Finding 5.1), not credential secrecy.

---

## 6. Backup Security

### FINDING 6.1: Backups Are Unencrypted Plaintext SQL

- **Severity:** Medium
- **File:** `scripts/backup-db.sh`
- **What happens:** The backup script runs `npx database db dump --linked` and writes the output to `backups/backup-YYYYMMDD-HHMMSS.sql`. These are plaintext SQL files containing all database content including client PII, financial data, recipes, and credentials.
- **Where they go:** `./backups/` directory in the project root. This directory is gitignored (`backups/` in `.gitignore:139`), so backups are not pushed to GitHub.
- **Retention:** Last 7 backups kept, older ones deleted automatically.
- **Encryption:** None. The SQL files are readable by any process or user with filesystem access.
- **Off-machine backup:** None. Backups exist only on the local machine. If the machine is lost, stolen, or its drive fails, all backups are gone along with it.

### FINDING 6.2: No Backup Verification or Integrity Checks

- **Severity:** Low
- **File:** `scripts/backup-db.sh:60-66`
- **What happens:** The script checks if the backup file is larger than 100 bytes, which catches empty files but not corrupted dumps.
- **Risk:** A partial or corrupted backup could pass the size check but fail to restore.

### Recommendation

- Encrypt backups at rest: pipe through `gpg --symmetric` or `age` before writing to disk.
- Copy backups off-machine: sync to an encrypted cloud storage (S3, Backblaze B2) or an external drive.
- Add a restore test to the backup script (dump, then attempt restore to a temporary database).

---

## 7. Windows-Specific Risks

### FINDING 7.1: Windows Firewall and RDP Status - Cannot Be Checked from Codebase

- **Severity:** Unknown (requires local system inspection)
- **What to check:**
  - **RDP (port 3389):** If Remote Desktop is enabled, anyone on the local network with the Windows credentials can take full control. Run `Get-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -Name fDenyTSConnections` in PowerShell. Value `0` = RDP enabled.
  - **Windows Firewall:** Run `Get-NetFirewallProfile | Select Name, Enabled` in PowerShell. All three profiles (Domain, Private, Public) should show `Enabled: True`.
  - **Inbound rules for ports 3000, 3100, 11434, 54322:** Run `Get-NetFirewallRule -Direction Inbound -Enabled True | Where { $_.LocalPort -in @(3000,3100,11434,54322) }` to check if these ports have explicit allow rules.

### FINDING 7.2: Physical Access Risks

- **Severity:** Informational
- **What's at risk with physical access:**
  1. `.env.local` contains all API keys (Stripe, Resend, Google OAuth, Gemini, Sentry, CRON_SECRET)
  2. `.auth/` directory contains agent session tokens
  3. `C:\Users\david\.cloudflared\*.json` contains Cloudflare Tunnel credentials
  4. `backups/` directory contains full plaintext database dumps
  5. `storage/` directory contains all uploaded files (recipes, documents, photos)
  6. Ollama model weights and any cached KV state
  7. Browser cookies/sessions for all logged-in services
- **Disk encryption:** Unknown. If BitLocker is not enabled, all of the above is readable by anyone who can boot from a USB drive.
- **Recommendation:** Verify BitLocker is enabled: `manage-bde -status C:` in an admin PowerShell. If not enabled, enable it.

### FINDING 7.3: Auto-Updates

- **Severity:** Informational
- **Risk:** If Windows Update is set to automatic (default on Home edition), a forced restart could kill the production server, the dev server, the Ollama process, and the Docker PostgreSQL container simultaneously without warning.
- **Mitigation:** Windows 11 Home has limited update deferral. "Active hours" should be set to cover the times the production server must be available.

---

## 8. Email Security

### FINDING 8.1: Email Configuration

- **Severity:** Informational
- **Files:** `lib/email/resend-client.ts:19-20`, `lib/email/send.ts`
- **Configuration:**
  - **Provider:** Resend (API-based, no SMTP server exposed)
  - **From address:** `info@cheflowhq.com` (configurable via `RESEND_FROM_EMAIL` env var)
  - **From name:** `CheFlow` (hardcoded in `resend-client.ts:20`)
  - **Circuit breaker:** Yes, trips after 5 consecutive Resend failures with 60s reset (`lib/email/send.ts:43`)
  - **PII logging:** Correctly avoids logging recipient email addresses (`lib/email/send.ts:61`)

### FINDING 8.2: SPF/DKIM/DMARC Must Be Verified Manually

- **Severity:** High (if not configured)
- **What Resend requires:** When you add a domain to Resend, it provides DNS records you must add:
  1. SPF TXT record (or Resend's include directive)
  2. DKIM CNAME records (typically `resend._domainkey.cheflowhq.com`)
  3. Resend supports DMARC but does not create it automatically - you must add your own
- **What to run:**
  ```bash
  nslookup -type=TXT cheflowhq.com
  nslookup -type=TXT _dmarc.cheflowhq.com
  nslookup -type=TXT resend._domainkey.cheflowhq.com
  ```
- **If DMARC is missing or set to `p=none`:** An attacker can send emails from `info@cheflowhq.com` (or any `@cheflowhq.com` address) that will pass basic checks at many mailbox providers. For a platform that sends quotes, payment requests, and event confirmations, this is a direct path to financial fraud against clients.

### FINDING 8.3: Resend API Key Exposure

- **Severity:** Low
- **What's protected:** The `RESEND_API_KEY` is in `.env.local` (gitignored). It is never exposed to the client (no `NEXT_PUBLIC_` prefix).
- **Risk:** If the API key is compromised, an attacker can send emails from `info@cheflowhq.com` via Resend's API. Resend has rate limits and audit logs, but the damage window could include phishing emails to all known client addresses.

---

## 9. Composite Attack Scenarios

### Scenario A: Local Network Attacker (e.g., shared WiFi, compromised IoT device)

1. Scan the network, find ports 3000/3100/11434/54322 open
2. Connect to PostgreSQL on 54322 with `postgres:postgres`
3. Extract all data: clients, financials, recipes, auth credentials (hashed)
4. Query Ollama on 11434 to understand the data schema or generate phishing content
5. Access the web app on 3000/3100 (no auth needed for SSE channels per prior audit)

### Scenario B: Stolen/Lost Laptop

1. Boot from USB (if BitLocker is off)
2. Read `.env.local` for all API keys
3. Read Cloudflare Tunnel credentials to redirect `app.cheflowhq.com` to attacker infrastructure
4. Read plaintext database backups
5. Use Stripe keys for financial operations
6. Use Resend key to send emails as ChefFlow

### Scenario C: Email Spoofing (if DMARC missing)

1. Attacker sends email from `info@cheflowhq.com` to a chef's client
2. Email contains a fake quote or payment link
3. Client pays attacker thinking it is a legitimate ChefFlow invoice
4. No DMARC = no automated rejection by receiving mail servers

---

## Gaps and Unknowns

1. **Cannot verify DNS records** from this environment (no `nslookup`/`dig` available). SPF/DKIM/DMARC status is the single highest-priority unknown.
2. **Cannot verify Windows Firewall rules** from the codebase. The actual exposure depends on firewall configuration.
3. **Cannot verify Ollama's actual bind address.** Default is `127.0.0.1`, but if `OLLAMA_HOST` is set differently, it could be network-exposed.
4. **Cannot verify BitLocker status.** Physical access risk severity depends entirely on this.
5. **Cannot verify the production Cloudflare Tunnel config** for `app.cheflowhq.com` (not in the repo).
6. **Docker Desktop networking behavior** on Windows 11 varies between WSL2 and Hyper-V backends. Port mapping to `0.0.0.0` may or may not expose to the network depending on the backend.

---

## Recommendations (Priority Order)

### Immediate (Do Today)

| #   | Action                                                                                                                                                          | Effort                                                          | Impact                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------ | ------------------------ |
| 1   | **Verify DNS email records** - run `nslookup -type=TXT _dmarc.cheflowhq.com`. If DMARC is missing, add `v=DMARC1; p=quarantine; rua=mailto:dmarc@cheflowhq.com` | 5 min                                                           | Prevents email spoofing  |
| 2   | **Bind PostgreSQL to localhost** - change `docker-compose.yml` port to `"127.0.0.1:54322:5432"`                                                                 | 1 min                                                           | Blocks network DB access |
| 3   | **Check Ollama bind address** - run `netstat -an                                                                                                                | findstr 11434`. If `0.0.0.0`, set `OLLAMA_HOST=127.0.0.1:11434` | 2 min                    | Blocks network AI access |
| 4   | **Check Windows Firewall** - verify it is enabled on all profiles. Block inbound 3000/3100/11434/54322 from non-localhost                                       | 10 min                                                          | Network-level defense    |

### Short Term (This Week)

| #   | Action                                                                                                                                                   | Effort                                                                   | Impact                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------- | ---------------------------- |
| 5   | **Change Next.js bind to 127.0.0.1** if tunnel still works (cloudflared connects to localhost) - change `-H 0.0.0.0` to `-H 127.0.0.1` in `package.json` | 2 min                                                                    | Blocks direct network access to web app |
| 6   | **Change PostgreSQL password** from `postgres` to something non-default                                                                                  | 5 min                                                                    | Defense in depth                        |
| 7   | **Verify BitLocker** - run `manage-bde -status C:`                                                                                                       | 1 min                                                                    | Physical access protection              |
| 8   | **Encrypt backups** - add `                                                                                                                              | gpg --symmetric --batch --passphrase-file /path/to/key` to backup script | 15 min                                  | Protects backup data at rest |
| 9   | **Remove tunnel UUID from repo** - move `.cloudflared/config.yml` to `.gitignore` or use env vars                                                        | 5 min                                                                    | Reduces information leakage             |

### Medium Term

| #   | Action                                                           | Effort | Impact                          |
| --- | ---------------------------------------------------------------- | ------ | ------------------------------- |
| 10  | **Off-machine encrypted backup** - sync backups to cloud storage | 1 hour | Disaster recovery               |
| 11  | **Run `dnstwist cheflowhq.com`** to check for lookalike domains  | 10 min | Brand protection                |
| 12  | **Set Windows Active Hours** to cover production uptime window   | 2 min  | Prevents forced restart         |
| 13  | **Audit Cloudflare Access policies** for the production tunnel   | 15 min | Verify external access controls |
