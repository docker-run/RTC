import { PersistedSportEvent, SportEvent } from "./types";

interface IEventStore {
  get(id: string): PersistedSportEvent | undefined;
  set(id: string, event: PersistedSportEvent): void;
  delete(id: string): void;
  getAll(): Record<string, PersistedSportEvent>;
}

export class EventStore implements IEventStore {
  private store: Record<string, PersistedSportEvent> = {};

  public get(id: string): PersistedSportEvent | undefined {
    return this.store[id];
  }

  public set(id: string, event: PersistedSportEvent): void {
    this.store[id] = event;
  }

  public delete(id: string): void {
    delete this.store[id];
  }

  public getAll(): Record<string, PersistedSportEvent> {
    return { ...this.store };
  }
}

interface IHistoricalEventStore {
  add(event: SportEvent): void;
  getAll(): Record<string, SportEvent>;
}


export class HistoricalEventStore implements IHistoricalEventStore {
  private store: Record<string, SportEvent> = {};

  public add(event: SportEvent): void {
    this.store[event.id] = event;
  }

  public getAll(): Record<string, SportEvent> {
    return { ...this.store };
  }
}

interface ITemporalMappingStore {
  set(id: string, value: string): void;
  get(id: string, timestamp?: string): string | undefined;
  getVersionAt(id: string, timestamp: string): string | undefined;
}

export class TemporalMappingStore implements ITemporalMappingStore {
  private store: Record<string, SportEvent> = {};

  public add(event: SportEvent): void {
  }

  public get(id: string, timestamp?: string) {

  }

  public set(id: string, value: string) {

  }

  public getVersionAt(id: string, timestamp: string) {
  }
}
