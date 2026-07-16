module.exports = {
  apps: [{
    name: "novsmm-notifications",
    script: "npm",
    args: "run dev",
    cwd: "/home/novafwsocial/novsmm/mini-services/notifications-service",
    env: {
      NOTIFICATIONS_SERVICE_SECRET: process.env.NOTIFICATIONS_SERVICE_SECRET || "",
    },
  }]
};
