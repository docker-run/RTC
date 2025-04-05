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
  private store: Record<string, Array<{ value: string; timestamp: string }>> = {};

  public set(id: string, value: string) {
    if (!this.store[id]) {
      this.store[id] = [];
    }

    this.store[id].push({
      value,
      timestamp: new Date().toISOString()
    });
  }

  public get(id: string, timestamp?: string) {
    const versions = this.store[id];

    if (!versions || versions.length === 0) {
      return undefined;
    };

    if (timestamp) {
      return this.getVersionAt(id, timestamp);
    }

    return versions[versions.length - 1].value;
  }

  public getVersionAt(id: string, timestamp: string) {
    const versions = this.store[id];

    if (!versions) {
      return undefined;
    }

    // find the most recent version before the timestamp
    for (let i = versions.length - 1; i >= 0; i--) {
      if (versions[i].timestamp <= timestamp) {
        return versions[i].value;
      }
    }

    return undefined;
  }
}
