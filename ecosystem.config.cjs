// PM2 Ecosystem Config — Memory-Safe for Raspberry Pi 5 (8GB)
// This file lives in the repo and is synced to the Pi during deploy.
// PM2 uses it for process management, memory limits, and log paths.
module.exports = {
  apps: [{
    name: 'chefflow-beta',
    cwd: '/home/davidferra/apps/chefflow-beta',
    script: 'node_modules/.bin/next',
    args: 'start -p 3200',

    // Memory limits — Pi has 8GB total, need headroom for OS + cloudflared
    node_args: '--max-old-space-size=1536',   // 1.5GB heap max
    max_memory_restart: '1800M',              // Auto-restart if RSS exceeds 1.8GB

    // Process management
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,

    // Graceful restart — wait for connections to drain
    kill_timeout: 5000,       // 5s grace period before SIGKILL
    listen_timeout: 10000,    // 10s to wait for app to bind port

    // Logging
    error_file: '/home/davidferra/.pm2/logs/chefflow-beta-error.log',
    out_file: '/home/davidferra/.pm2/logs/chefflow-beta-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',

    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3200,
      NODE_OPTIONS: '--max-old-space-size=1536',
    },
  }],
}
