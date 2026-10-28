module.exports = {
  apps: [{
    name: 'agrisync-backend',
    script: 'server.js',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    restart_delay: 3000,
    env: {
      NODE_ENV: 'development',
    },
  }],
}
