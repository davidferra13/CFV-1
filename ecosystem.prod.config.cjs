// PM2 Ecosystem Config - Production (app.cheflowhq.com)
// Raspberry Pi 5 (8GB) - Port 3000
// 
// Deploy this to /home/davidferra/apps/chefflow-prod/
// Start with: pm2 start ecosystem.prod.config.cjs
module.exports = {
  apps: [{
    name: 'chefflow-prod',
    cwd: '/home/davidferra/apps/chefflow-prod',
    script: 'node_modules/.bin/next',
    args: 'start -p 3000',

    // Memory limits - Pi has 8GB total, need headroom for OS + cloudflared + beta
    node_args: '--max-old-space-size=1536',   // 1.5GB heap max
    max_memory_restart: '1800M',              // Auto-restart if RSS exceeds 1.8GB

    // Process management
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,

    // Graceful restart - wait for connections to drain
    kill_timeout: 5000,       // 5s grace period before SIGKILL
    listen_timeout: 10000,    // 10s to wait for app to bind port

    // Crash recovery
    max_restarts: 10,         // Max restarts within restart_delay window
    restart_delay: 5000,      // 5s between restart attempts
    exp_backoff_restart_delay: 100, // Exponential backoff starting at 100ms

    // Logging
    error_file: '/home/davidferra/.pm2/logs/chefflow-prod-error.log',
    out_file: '/home/davidferra/.pm2/logs/chefflow-prod-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',

    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NODE_OPTIONS: '--max-old-space-size=1536',
    },
  }],
}
