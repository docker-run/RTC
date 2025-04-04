import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { SportsEventsService } from '../src/sport-events-service';
import { EventMappingService } from '../src/event-mapping-service';

describe('App', () => {
  it('should create an express app with /client/state endpoint', async () => {
    const mockService = {
      getCurrentEvents: vi.fn().mockResolvedValue({}),
    };

    const mockMappingService = {
    };

    vi.spyOn(SportsEventsService, 'create').mockReturnValue(mockService as any);
    vi.spyOn(EventMappingService, 'create').mockReturnValue(mockMappingService as any);

    const app = createApp();

    const response = await request(app).get('/client/state');

    expect(response.status).toBe(200);

    expect(SportsEventsService.create).toHaveBeenCalled();
    expect(EventMappingService.create).toHaveBeenCalled();
  });
});

