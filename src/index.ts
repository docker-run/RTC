import { createApp } from './app';
import { Logger } from './logger';

const PORT = process.env.PORT || 3001;

const setupMemoryMonitoring = () => {
  return setInterval(() => {
    const memoryUsage = process.memoryUsage();
    Logger.debug(`Memory usage: 
      RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB 
      HeapTotal: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB
      HeapUsed: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
  }, 60000);
};

const startServer = async () => {
  try {
    const memoryMonitorInterval = setupMemoryMonitoring();

    const { app, eventMappingService, sportsEventsService } = await createApp();

    const server = app.listen(PORT, () => {
      Logger.info(`Server ready { port=${PORT} }`);
    });

    const shutdown = () => {
      Logger.info('Shutting down server...');
      clearInterval(memoryMonitorInterval);

      eventMappingService.stopPolling();
      sportsEventsService.stopPolling();

      server.close(() => {
        Logger.info('Server has been stopped');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    return server;
  } catch (error) {
    Logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
