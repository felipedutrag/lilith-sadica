module.exports = {
  apps: [
    {
      name: 'lilith',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 80',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 80
      }
    }
  ]
};
