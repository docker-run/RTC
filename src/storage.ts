import { PersistedSportEvent, SportEvent } from "./types";

interface IEventStore {
  get(id: string): PersistedSportEvent | undefined;
  set(id: string, event: PersistedSportEvent): void;
  delete(id: string): void;
  getAll(): Record<string, PersistedSportEvent>;
}

// TODO: Add EventStore

interface IHistoricalEventStore {
  add(event: SportEvent): void;
  getAll(): Record<string, SportEvent>;
}


// TODO: Add HistoricalEventStore

interface ITemporalMappingStore {
  set(id: string, value: string): void;
  get(id: string, timestamp?: string): string | undefined;
  getVersionAt(id: string, timestamp: string): string | undefined;
}

// TODO: Add TemporalMappinStore
