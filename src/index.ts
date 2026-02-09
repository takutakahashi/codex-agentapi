/**
 * Main entry point
 */

import { loadConfig } from './utils/config.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    const config = loadConfig();
    const app = createServer(config);

    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`Server running at http://${config.server.host}:${config.server.port}`);
      logger.info('Press Ctrl+C to stop');
    });

    // Graceful shutdown
    const shutdown = () => {
      logger.info('Shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
