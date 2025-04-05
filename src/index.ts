import { createApp } from './app';
import { Logger } from './logger';

const PORT = process.env.PORT || 3001;
const app = createApp();

const memoryMonitorInterval = setInterval(() => {
  const memoryUsage = process.memoryUsage();
  Logger.debug(`Memory usage: 
    RSS: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB 
    HeapTotal: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB
    HeapUsed: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
}, 60000);

app.listen(PORT, () => {
  Logger.info(`Server ready { port=${PORT} }`);
});

process.on('SIGTERM', () => {
  clearInterval(memoryMonitorInterval);
  process.exit(0);
});

process.on('SIGINT', () => {
  clearInterval(memoryMonitorInterval);
  process.exit(0);
});
