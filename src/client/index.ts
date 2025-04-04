import express from 'express';
import { SportsEventsService } from '../sport-events-service';

export function clientStateRoute(service: SportsEventsService) {
  const router = express.Router();

  router.get('/client/state', async (req, res) => {
    try {
      const events = await service.getCurrentEvents();
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
