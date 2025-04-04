import express from 'express';
import { SportsEventsService } from '../sport-events-service';

export function clientStateRoute(service: SportsEventsService) {
  const router = express.Router();

  // TODO error handling
  router.get('/client/state', async (req, res) => {
    const events = await service.getCurrentEvents();
    res.status(200).json(events);
  });

  return router;
}
