// PM2 Ecosystem Config - Local Windows Development
// Keeps devtools services alive across reboots.
// Usage: pm2 start ecosystem.local.cjs
module.exports = {
  apps: [{
    name: 'chefflow-hub',
    cwd: __dirname,
    script: 'devtools/persona-inbox-server.mjs',
    interpreter: 'node',
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    kill_timeout: 3000,
    env: {
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      // Set PERSONA_INBOX_TOKEN in your environment for remote access auth
    },
  }],
}
