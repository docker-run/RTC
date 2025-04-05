import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventStore, HistoricalEventStore, TemporalMappingStore } from '../src/storage';
import { SportEvent } from '../src/types';

const mockFootballSportEvent = {
  id: '1',
  sportId: 'football',
  competitionId: 'premier-league',
  startTime: '2024-01-01T00:00:00Z',
  homeCompetitorId: 'home-1',
  awayCompetitorId: 'away-1',
  statusId: 'LIVE',
  scores: 'PERIOD_1@1:0'
}

const mockBasketballSportEvent = {
  id: '2',
  sportId: 'basketball',
  competitionId: 'nba',
  startTime: '2024-01-01T00:00:00Z',
  homeCompetitorId: 'home-2',
  awayCompetitorId: 'away-2',
  statusId: 'PRE',
  scores: 'N/A'
}

describe('EventStore', () => {
  let store: EventStore;

  beforeEach(() => {
    store = new EventStore();
  });

  it('should store and retrieve events', () => {
    store.set('1', mockFootballSportEvent);
    const retrieved = store.get('1');

    expect(retrieved).toEqual(mockFootballSportEvent);
  });

  it('should delete events', () => {
    store.set('1', mockFootballSportEvent);
    store.delete('1');

    expect(store.get('1')).toBeUndefined();
  });

  it('should return all events', () => {
    store.set('1', mockFootballSportEvent);
    store.set('2', mockBasketballSportEvent);

    const allEvents = store.getAll();
    expect(allEvents).toEqual({
      '1': mockFootballSportEvent,
      '2': mockBasketballSportEvent
    });
  });
});

const mockSnapshotSportEvent: SportEvent = {
  id: '3eccf850-571f-4e18-8cb3-2c9e3afade7b',
  status: 'REMOVED',
  scores: {
    CURRENT: {
      type: "CURRENT",
      home: "0",
      away: "0"
    },
  },
  startTime: "2024-03-04T10:36:07.812Z",
  sport: 'FOOTBALL',
  competitors: {
    HOME: { type: 'HOME', name: 'Juventus' },
    AWAY: { type: 'AWAY', name: 'Paris Saint-Germain' }
  },
  competition: 'UEFA'
}

describe('HistoricalEventStore', () => {
  let store: HistoricalEventStore;

  beforeEach(() => {
    store = new HistoricalEventStore();
  });

  it('stores snapshots of past sport events', () => {
    store.add(mockSnapshotSportEvent);
    const allEvents = store.getAll();

    expect(allEvents).toEqual({ [mockSnapshotSportEvent.id]: mockSnapshotSportEvent });
  });
});

describe('TemporalMappingStore', () => {
  let store: TemporalMappingStore;

  const mockNow = new Date('2025-01-01T00:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);

    // 10 mins retention policy, 5 mins cleanup task interval
    store = new TemporalMappingStore(10 * 60 * 1000, 5 * 60 * 1000);
  });

  afterEach(() => {
    store.destroy();
    vi.useRealTimers();
  });

  it('stores and retrieves mappings', () => {
    store.set('1', 'FOOTBALL');
    expect(store.get('1')).toBe('FOOTBALL');
  });

  it('should return undefined for non-existent mappings', () => {
    expect(store.get('unnamed')).toBeUndefined();
  });

  it('should retrieve historical versions', () => {
    const timestamp1 = new Date().toISOString();
    store.set('1', 'VERSION1');

    // New sport event version arrive from API
    setTimeout(() => {
      const timestamp2 = new Date().toISOString();
      store.set('1', 'VERSION2');

      expect(store.get('1')).toBe('VERSION2');
      expect(store.getVersionAt('1', timestamp1)).toBe('VERSION1');
      expect(store.getVersionAt('1', timestamp2)).toBe('VERSION2');
    }, 10);
  })

  it('should remove entries older than max age during cleanup', () => {
    const testData = [
      { id: 'id1', value: 'value1', time: '2024-12-31T23:55:00Z' }, // 5 mins before now (should be kept)
      { id: 'id2', value: 'value2', time: '2024-12-31T23:59:00Z' }, // 1 min before now (should be kept)
      { id: 'id3', value: 'value3', time: '2024-12-31T23:49:00Z' }, // 11 mins before now (should be removed)
      { id: 'id4', value: 'value4', time: '2024-12-31T23:50:00Z' }, // exactly 10 mins before now (edge case, should be kept)
    ];

    testData.forEach(data => {
      vi.setSystemTime(new Date(data.time));
      store.set(data.id, data.value);
    });

    // Reset time to original mockNow
    vi.setSystemTime(mockNow);

    // Verify all entries exist before cleanup
    expect(store.get('id1')).toBe('value1');
    expect(store.get('id2')).toBe('value2');
    expect(store.get('id3')).toBe('value3');
    expect(store.get('id4')).toBe('value4');

    store['cleanupTask']();

    expect(store.get('id1')).toBe('value1'); // 5 mins old - kept
    expect(store.get('id2')).toBe('value2'); // 1 min old - kept
    expect(store.get('id3')).toBeUndefined(); // 11 mins old - removed
    expect(store.get('id4')).toBe('value4'); // exactly 10 mins old - kept (edge case)
  });
});
