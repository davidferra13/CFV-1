# ChefFlow PITR Restore Runbook

Point-in-time recovery uses three artifacts:

- encrypted physical base backup from `backups/basebackups/`
- WAL archive files from `backups/wal_archive/`
- exact target timestamp before the bad write

This is a destructive recovery path. Practice it on a separate clone and separate Docker volume before using it on the live database.

## Preconditions

1. `BACKUP_PASSPHRASE` is available.
2. WAL archiving has been activated by a controlled PostgreSQL restart.
3. `backups/basebackups/` contains a base backup older than the target timestamp.
4. `backups/wal_archive/` contains continuous WAL files from that base backup through the target timestamp.
5. App writes are stopped before live recovery.

## Verify Artifacts

```powershell
Get-ChildItem backups\basebackups\chefflow-basebackup-*.tar.gz.gpg | Sort-Object LastWriteTime -Descending | Select-Object -First 3
Get-ChildItem backups\wal_archive | Sort-Object LastWriteTime -Descending | Select-Object -First 10
```

Verify the base backup checksum:

```powershell
$backup = "backups\basebackups\chefflow-basebackup-YYYY-MM-DD-HHMMSS.tar.gz.gpg"
$manifest = Get-Content -Raw "$backup.manifest.json" | ConvertFrom-Json
$hash = (Get-FileHash -Algorithm SHA256 -Path $backup).Hash.ToLowerInvariant()
if ($hash -ne $manifest.sha256) { throw "Base backup checksum mismatch" }
```

## Restore To A Separate Docker Volume First

Use a disposable volume so the live `chefflow_pgdata` volume is not touched:

```powershell
$targetTime = "2026-04-30 14:03:00-04"
$backup = "C:\Users\david\Documents\CFv1\backups\basebackups\chefflow-basebackup-YYYY-MM-DD-HHMMSS.tar.gz.gpg"
$restoreRoot = "C:\Users\david\Documents\CFv1\backups\pitr-verify"
New-Item -ItemType Directory -Path $restoreRoot -Force | Out-Null

$passphrase = (Get-Content .env.local | Where-Object { $_ -match '^BACKUP_PASSPHRASE=' } | Select-Object -First 1) -replace '^BACKUP_PASSPHRASE=', ''
$passphrase = $passphrase.Trim().Trim('"').Trim("'")
$passphrase | gpg --batch --yes --passphrase-fd 0 -o "$restoreRoot\basebackup.tar.gz" -d $backup
tar -xzf "$restoreRoot\basebackup.tar.gz" -C $restoreRoot
```

Create a temporary volume and load the extracted base backup into it:

```powershell
docker volume create chefflow_pitr_verify
docker run --rm -v chefflow_pitr_verify:/pgdata -v "${restoreRoot}:/restore" alpine sh -c "rm -rf /pgdata/* && cp -a /restore/chefflow-basebackup-*/* /pgdata/ && chown -R 70:70 /pgdata"
```

Start a one-off PostgreSQL container against that volume:

```powershell
docker run --rm --name chefflow_pitr_verify `
  -p 55432:5432 `
  -v chefflow_pitr_verify:/var/lib/postgresql/data `
  -v "C:\Users\david\Documents\CFv1\backups\wal_archive:/wal_archive:ro" `
  -e POSTGRES_PASSWORD=postgres `
  postgres:15-alpine `
  postgres -c "restore_command=cp /wal_archive/%f %p" -c "recovery_target_time=$targetTime"
```

In a second terminal, verify the restored database:

```powershell
docker exec chefflow_pitr_verify psql -U postgres -d postgres -c "SELECT COUNT(*) FROM chefs;"
docker exec chefflow_pitr_verify psql -U postgres -d postgres -c "SELECT COUNT(*) FROM events;"
docker exec chefflow_pitr_verify psql -U postgres -d postgres -c "SELECT COUNT(*) FROM ledger_entries;"
```

Stop and remove the test volume when done:

```powershell
docker stop chefflow_pitr_verify
docker volume rm chefflow_pitr_verify
```

## Live Recovery

Only run live recovery after a separate-volume restore succeeds.

1. Stop app writes.
2. Take a final logical backup if the database is still reachable.
3. Stop PostgreSQL in a maintenance window.
4. Preserve the old data volume before replacing it.
5. Restore the verified base backup plus WAL to the live volume.
6. Validate tenants, clients, events, recipes, ledger entries, auth roles, and Stripe references.
7. Restart app traffic only after validation passes.

Do not guess the recovery target timestamp. Pick the last timestamp before the known bad write.
