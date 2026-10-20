const path = require('path');

module.exports = {
  apps: [
    {
      name: 'etiquetas-api',
      cwd: path.join(__dirname, 'backend'),
      script: 'server.js',
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        PORT: 3001,
        PRINTER_HOST: '192.168.1.124',
        PRINTER_PORT: 9100
      }
    },
    {
      name: 'etiquetas-frontend',
      cwd: __dirname,
      script: 'serve',
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        PM2_SERVE_PATH: path.join(__dirname, 'frontend', 'build'),
        PM2_SERVE_PORT: 3000,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html'
      }
    }
  ]
};
