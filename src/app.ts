import axios from 'axios';
import express from 'express';
import { clientStateRoute } from './client';
import { SportEventsService } from './sport-events-service';
import { AppConfig } from './types';
import { EventMappingService } from './event-mapping-service';
import { Logger } from './logger';
import { EventStore, HistoricalEventStore, TemporalMappingStore } from './storage';

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
      Logger.error(`Failed to fetch data from ${url}`, error);
      throw error;
    }
  };

  const mappingStore = new TemporalMappingStore(config.maxAge, config.temporalMappingStoreIntervalMs);
  const historicalEventStore = new HistoricalEventStore();
  const eventStore = new EventStore();

  const eventMappingService = EventMappingService.create({
    fetchMappings: createApiClient<{ mappings?: string }>(config.mappingsApi),
    mappingStore,
  });

  eventMappingService.startPolling(config.pollingIntervalMs)

  const sportsEventsService = SportEventsService.create({
    fetchEvents: createApiClient<{ odds?: string }>(config.sportsEventsApi),
    eventMappingService,
    eventStore,
    historicalEventStore,
  });

  sportsEventsService.startPolling(config.pollingIntervalMs)

  app.use('/', clientStateRoute(sportsEventsService));

  return app;
}
