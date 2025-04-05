import { describe, it, expect, beforeEach } from 'vitest';
import { EventStore, HistoricalEventStore } from '../src/storage';
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
