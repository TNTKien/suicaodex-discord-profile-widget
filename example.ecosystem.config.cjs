module.exports = {
  apps: [
    {
      name: "suicaodex-discord-profile-widget",
      cwd: "path\\to\\suicaodex-discord-profile-widget", // something like: "D:\\code\\suicaodex-discord-profile-widget"
      script: "bun",
      args: "run start",
      interpreter: "none",
      autorestart: true,
      watch: false,
    },
  ],
};