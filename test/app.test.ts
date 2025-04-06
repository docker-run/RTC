import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { SportEventsService } from '../src/sport-events-service';
import { EventMappingService } from '../src/event-mapping-service';

describe('App', () => {
  it('should create an express app with /client/state endpoint', async () => {
    const mockService = {
      getCurrentEvents: vi.fn().mockResolvedValue({}),
      startPolling: vi.fn()
    };

    const mockMappingService = {
      startPolling: vi.fn()
    };


    vi.spyOn(SportEventsService, 'create').mockReturnValue(mockService as any);
    vi.spyOn(EventMappingService, 'create').mockReturnValue(mockMappingService as any);

    const { app } = await createApp();

    const response = await request(app).get('/client/state');

    expect(response.status).toBe(200);

    expect(SportEventsService.create).toHaveBeenCalled();
    expect(EventMappingService.create).toHaveBeenCalled();
    expect(mockService.startPolling).toHaveBeenCalledWith(1000);
    expect(mockMappingService.startPolling).toHaveBeenCalledWith(1000);
  });
});

