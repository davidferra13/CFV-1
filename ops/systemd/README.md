# ChefFlow Production systemd Setup

## Overview

These systemd units replace PM2 for production process management on the Raspberry Pi.
Benefits: auto-restart on crash, start on boot, memory limits, proper logging.

## Files

| File                        | Purpose                       |
| --------------------------- | ----------------------------- |
| `chefflow-prod.service`     | Main app service (port 3000)  |
| `chefflow-watchdog.service` | Health check oneshot          |
| `chefflow-watchdog.timer`   | Runs watchdog every 2 minutes |

## Installation (on Pi)

```bash
# Copy files
sudo cp ops/systemd/chefflow-*.service /etc/systemd/system/
sudo cp ops/systemd/chefflow-*.timer /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start production app
sudo systemctl enable chefflow-prod
sudo systemctl start chefflow-prod

# Enable and start watchdog timer
sudo systemctl enable chefflow-watchdog.timer
sudo systemctl start chefflow-watchdog.timer

# Check status
sudo systemctl status chefflow-prod
sudo systemctl list-timers | grep chefflow
```

## Switching from PM2 to systemd

```bash
# 1. Stop PM2 processes
pm2 stop chefflow-prod
pm2 delete chefflow-prod

# 2. Disable PM2 startup
pm2 unstartup

# 3. Enable systemd services (see above)
```

## Commands

```bash
# View status
sudo systemctl status chefflow-prod

# View logs
sudo journalctl -u chefflow-prod -f

# Restart
sudo systemctl restart chefflow-prod

# Stop
sudo systemctl stop chefflow-prod
```

## Note on Node Path

The service file assumes Node.js is installed via nvm at:
`/home/davidferra/.nvm/versions/node/v20.18.0/bin/node`

Adjust this path if your Node version differs:

```bash
which node
# Update ExecStart in chefflow-prod.service
```
