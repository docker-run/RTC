import { describe, it, expect, beforeEach } from 'vitest';
import { EventStore } from '../src/storage';

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

