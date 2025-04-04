import express from 'express';
import { clientStateRoute } from './client';

export function createApp(): express.Express {
  const app = express();

  app.use('/', clientStateRoute({} as any));

  return app;
}
