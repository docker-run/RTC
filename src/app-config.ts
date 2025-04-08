import axios from 'axios';
import { AppConfig } from './types';
import { Logger } from './logger';

export const appConfig: AppConfig = {
  sportEventsApi: process.env.SPORT_EVENTS_API || 'http://localhost:3000/api/state',
  mappingsApi: process.env.MAPPINGS_API || 'http://localhost:3000/api/mappings',
  pollingIntervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '1000', 10),
}

export const createApiClient = <T>(url: string) => async (): Promise<T> => {
  try {
    const response = await axios.get<T>(url);
    return response.data;
  } catch (error) {
    Logger.error(`Failed to fetch data from ${url}`, error);
    throw error;
  }
};

export const fetchMappings = createApiClient<{ mappings?: string }>(appConfig.mappingsApi)
export const fetchEvents = createApiClient<{ odds?: string }>(appConfig.sportEventsApi)
