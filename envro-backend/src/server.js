import { config } from './config/index.js';
import { connectDB } from './config/database.js';
import { configureCloudinary } from './config/cloudinary.js';
import { verifyEmailConnection } from './config/email.js';
import { logger } from './utils/logger.js';
import { app } from './app.js';

const PORT = config.port;

async function startServer() {
  try {
    await connectDB();
    configureCloudinary();
    await verifyEmailConnection();

    app.listen(PORT, () => {
      logger.info(
        `EnviroGuard backend running on port ${PORT} [${config.env}]`
      );
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: reason?.message || reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message });
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});
