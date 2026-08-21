import app from "./app";
import { logger } from "./lib/logger";
import { processPendingNotificationJobs } from "./services/pushNotifications";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  void processPendingNotificationJobs().catch((err) => logger.warn({ err }, "Initial notification delivery sweep failed"));
  setInterval(() => {
    void processPendingNotificationJobs().catch((err) => logger.warn({ err }, "Notification delivery sweep failed"));
  }, 30_000).unref();
});
