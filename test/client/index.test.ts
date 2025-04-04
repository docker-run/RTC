import request from 'supertest';
import express from 'express';
import { clientStateRoute } from '../../src/client';
import { describe, expect, it, vi } from 'vitest';
import { SportsEventsService } from '../../src/sport-events-service';

describe('GET /client/state', () => {
  it('should return 200 status code', async () => {
    const mockService = {
      getCurrentEvents: vi.fn().mockResolvedValue({})
    } as unknown as SportsEventsService;

    const app = express();
    app.use(clientStateRoute(mockService));

    await request(app)
      .get('/client/state')
      .expect(200);
  });

  it('should call getCurrentEvents from service', async () => {
    const mockService = {
      getCurrentEvents: vi.fn().mockResolvedValue({})
    } as unknown as SportsEventsService;

    const app = express();
    app.use(clientStateRoute(mockService));

    await request(app).get('/client/state');

    expect(mockService.getCurrentEvents).toHaveBeenCalled();
  });

  it('should return 500 when service fails', async () => {
    const mockService = {
      getCurrentEvents: vi.fn().mockRejectedValue(new Error('Service failed'))
    } as unknown as SportsEventsService;

    const app = express();
    app.use(clientStateRoute(mockService));

    await request(app)
      .get('/client/state')
      .expect(500);
  });
});
