import express from 'express';
import { clientStateRoute } from './client';
import { SportEventsService } from './sport-events-service';
import { EventMappingService } from './event-mapping-service';
import { Logger } from './logger';
import { EventStore, HistoricalEventStore } from './storage';
import { appConfig, fetchEvents, fetchMappings } from './app-config';


export async function createApp() {
  const app = express();

  const historicalEventStore = new HistoricalEventStore();
  const eventStore = new EventStore();

  const eventMappingService = EventMappingService.create({
    fetchMappings,
  });

  const sportsEventsService = SportEventsService.create({
    fetchEvents,
    eventMappingService,
    eventStore,
    historicalEventStore,
  });

  try {
    await sportsEventsService.startPolling(appConfig.pollingIntervalMs);
  } catch (error) {
    Logger.error('Failed to start polling service', error);
    throw error;
  }

  app.use('/', clientStateRoute(sportsEventsService));

  return { app, eventMappingService, sportsEventsService };
}
