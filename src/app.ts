import axios from 'axios';
import express from 'express';
import { clientStateRoute } from './client';
import { SportEventsService } from './sport-events-service';
import { AppConfig } from './types';
import { EventMappingService } from './event-mapping-service';
import { Logger } from './logger';
import { EventStore, HistoricalEventStore, TemporalMappingStore } from './storage';

export async function createApp(
  config: AppConfig = {
    sportEventsApi: process.env.SPORT_EVENTS_API || 'http://localhost:3000/api/state',
    mappingsApi: process.env.MAPPINGS_API || 'http://localhost:3000/api/mappings',
    pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '1000', 10),
    maxAge: 10 * 60 * 1000,
    temporalMappingStoreIntervalMs: 5 * 60 * 1000
  }
) {
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

  const sportsEventsService = SportEventsService.create({
    fetchEvents: createApiClient<{ odds?: string }>(config.sportEventsApi),
    eventMappingService,
    eventStore,
    historicalEventStore,
  });

  try {
    await eventMappingService.startPolling(config.pollingIntervalMs);
    await sportsEventsService.startPolling(config.pollingIntervalMs);
  } catch (error) {
    Logger.error('Failed to start polling services', error);
    throw error;
  }

  app.use('/', clientStateRoute(sportsEventsService));

  return { app, eventMappingService, sportsEventsService };
}
