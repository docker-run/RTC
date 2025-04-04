import express from 'express';
import { clientStateRoute } from './client';
import axios from 'axios';
import { SportsEventsService } from './sport-events-service';
import { AppConfig } from './types';
import { EventMappingService } from './event-mapping-service';

export function createApp(
  config: AppConfig = {
    sportsEventsApi: process.env.SPORTS_EVENTS_API || 'http://localhost:3000/api/state',
    mappingsApi: process.env.MAPPINGS_API || 'http://localhost:3000/api/mappings',
    pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '1000', 10),
    maxAge: 10 * 60 * 1000,
    temporalMappingStoreIntervalMs: 5 * 60 * 1000
  }
): express.Express {
  const app = express();

  const createApiClient = <T>(url: string) => async (): Promise<T> => {
    try {
      const response = await axios.get<T>(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const eventMappingService = EventMappingService.create({
    fetchMappings: createApiClient<{ mappings?: string }>(config.mappingsApi),
    mappingStore: {}
  });

  const sportsEventService = SportsEventsService.create({
    fetchEvents: createApiClient<{ odds?: string }>(config.sportsEventsApi),
    eventMappingService,
    eventStore: {},
    historicalEventStore: {}
  });


  app.use('/', clientStateRoute(sportsEventService));

  return app;
}
