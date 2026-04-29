# Runtime Topology Audit

ChefFlow has had conflicting runtime truth across docs and operational files. The current canonical topology is:

| Environment | Local port | Public domain |
| --- | ---: | --- |
| Development | 3100 | localhost |
| Beta | 3200 | beta.cheflowhq.com |
| Production | 3300 | app.cheflowhq.com |
| Ollama | 11434 | localhost |

Use the read-only auditor when changing watchdogs, health checks, launchers, tunnels, or runbooks:

```powershell
node scripts/audit-runtime-topology.mjs
```

For machine-readable output:

```powershell
node scripts/audit-runtime-topology.mjs --json
```

For CI-style failure on error findings:

```powershell
node scripts/audit-runtime-topology.mjs --strict
```

The auditor scans a fixed manifest of documented and operational files, extracts port and domain evidence, and classifies conflicts. It is intentionally read-only. It does not start servers, stop servers, kill processes, register scheduled tasks, mutate tunnel config, or edit files.

Current high-risk conflict classes:

- `port-conflict`: more than one port is asserted for the same environment.
- `operational-drift`: an operational file maps an environment to a non-canonical port.
- `stale-runbook`: a documented source maps an environment to a non-canonical port.
- `domain-conflict`: a public domain is tied to a non-canonical local port.
- `missing-prod-domain`: scanned sources do not mention the production domain.

Production-specific expectation: `app.cheflowhq.com` should map to the production environment on local port `3300`. Any source tying the production domain or production health checks to another local port should be treated as drift until the developer intentionally updates the canonical topology.
