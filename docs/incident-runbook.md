# ChefFlow Incident Runbook

Quick reference for diagnosing and recovering from common production incidents.

---

## Outage: app.cheflowhq.com Returns 502

**Symptom:** Browser shows 502 Bad Gateway or Cloudflare error page.

**Cause:** Cloudflare Tunnel reached the Pi, but the Node.js app isn't responding.

**Recovery (SSH required):**

```bash
# SSH into Pi
ssh davidferra@10.0.0.177

# Option A: Quick restart
pm2 restart chefflow-prod

# Option B: Full recovery script
bash ~/apps/chefflow-prod/scripts/recover-production.sh

# Verify
curl http://localhost:3000/api/health/ping
```

**Root cause investigation:**

```bash
# Check PM2 logs for crash reason
pm2 logs chefflow-prod --lines 100

# Check memory
free -h

# Check disk
df -h

# Check if something else grabbed port 3000
sudo lsof -i :3000
```

---

## Outage: Cannot SSH into Pi

**Symptom:** `ssh davidferra@10.0.0.177` times out or connection refused.

**Possible causes:**

1. Pi is offline (power, network)
2. Pi IP changed (DHCP)
3. SSH service not running

**Recovery:**

1. Check if Pi is on the network: `ping 10.0.0.177`
2. Check router DHCP lease table for Pi's current IP
3. If Pi is physically accessible, connect monitor/keyboard
4. Power cycle the Pi if unresponsive

---

## Outage: Cloudflare Tunnel Down

**Symptom:** App responds on localhost:3000 but not via cheflowhq.com.

**Recovery:**

```bash
# SSH into Pi
ssh davidferra@10.0.0.177

# Check cloudflared service
sudo systemctl status cloudflared

# Restart tunnel
sudo systemctl restart cloudflared

# View tunnel logs
sudo journalctl -u cloudflared -f
```

---

## High Memory Usage

**Symptom:** App crashes with OOM (Out of Memory), restarts frequently.

**Diagnosis:**

```bash
# Check current memory
free -h

# Check PM2 memory usage
pm2 monit

# Check for memory leaks
pm2 logs chefflow-prod --lines 200 | grep -i memory
```

**Mitigation:**

```bash
# Restart app to reclaim memory
pm2 restart chefflow-prod

# If persistent, reduce heap size in ecosystem config
# node_args: '--max-old-space-size=1024'
```

---

## Database Connection Issues

**Symptom:** 500 errors on API routes, "connection refused" in logs.

**Diagnosis:**

```bash
# Check if PostgreSQL is running
docker ps | grep postgres
# or
sudo systemctl status postgresql

# Test DB connection
psql -h localhost -U postgres -d postgres -c "SELECT 1;"
```

**Recovery:**

```bash
# Restart PostgreSQL container
docker restart chefflow_postgres

# Or restart PostgreSQL service
sudo systemctl restart postgresql
```

---

## Preventing Future Incidents

**Enable auto-recovery watchdog:**

```bash
# On Pi, add cron job
crontab -e

# Add this line (checks every 2 minutes)
*/2 * * * * /home/davidferra/apps/chefflow-prod/scripts/pi-watchdog.sh >> /home/davidferra/.pm2/logs/watchdog.log 2>&1
```

**Enable PM2 startup on boot:**

```bash
pm2 startup
pm2 save
```

**Or switch to systemd (recommended):**

See `ops/systemd/README.md` for full instructions.

---

## External Monitoring

Set up UptimeRobot (free tier, 50 monitors):

1. Sign up at https://uptimerobot.com
2. Add HTTP(s) monitor: `https://app.cheflowhq.com/api/health`
3. Add HTTP(s) monitor: `https://beta.cheflowhq.com/api/health`
4. Set keyword check: response must contain "ok"
5. Set alert contacts (email, SMS, Slack)

This provides off-site monitoring that doesn't depend on your local network.

---

## Contact Escalation

If the above steps don't resolve the issue:

1. Check Cloudflare dashboard for any platform issues
2. Check Neon/Supabase dashboard for database status (if using managed DB)
3. Review recent deployments in git log for potential regressions
