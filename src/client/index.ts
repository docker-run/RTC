import express from 'express';
import { SportEventsService } from '../sport-events-service';
import { Logger } from '../logger';

export function clientStateRoute(service: SportEventsService) {
  const router = express.Router();

  router.get('/client/state', async (req, res) => {
    const startTime = process.hrtime.bigint();

    try {
      const events = service.getCurrentEvents();
      Logger.info('Fetched current events', { eventCount: Object.keys(events).length });
      res.status(200).json(events);
    } catch (error) {
      Logger.error('Error fetching events', error);
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      Logger.apiRequest(req, res, startTime);
    }
  });

  return router;
}
