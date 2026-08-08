module.exports = {
  apps: [
    {
      name: 'flenvn-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        API_BASE_URL: 'http://localhost:5000',
      },
    },
  ],
};
