module.exports = {
  apps: [
    {
      name: "persona-inbox",
      script: "devtools/persona-inbox-server.mjs",
      cwd: process.env.CHEFFLOW_ROOT || "C:\\Users\\david\\Documents\\CFv1",
      watch: false,
      max_memory_restart: "512M",
      max_restarts: 10,
      restart_delay: 5000,
      exp_backoff_restart_delay: 1000,
      kill_timeout: 6000,
      env: {
        NODE_ENV: "production",
        OLLAMA_BASE_URL: "http://127.0.0.1:11434",
        EXPAND_MODEL: "gemma4:e4b",
      },
    },
  ],
};
