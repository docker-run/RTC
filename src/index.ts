import { createApp } from './app';
import { Logger } from './logger';

const PORT = process.env.PORT || 3001;
const app = createApp();

app.listen(PORT, () => {
  Logger.info(`Server ready { port=${PORT} }`);
});
