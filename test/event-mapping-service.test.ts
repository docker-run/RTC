import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventMappingService } from '../src/event-mapping-service';
import { TemporalMappingStore } from '../src/storage';

describe('EventMappingService', () => {
  let service: EventMappingService;
  let mockStore: TemporalMappingStore;
  let mockFetchMappings: any;

  beforeEach(() => {
    mockStore = new TemporalMappingStore(10000, 5000);
    mockFetchMappings = vi.fn().mockResolvedValue({ mappings: '1:FOOTBALL;2:BASKETBALL;3:LIVE;4:PRE' });
    service = EventMappingService.create({
      fetchMappings: mockFetchMappings,
      mappingStore: mockStore
    });
  });

  afterEach(() => {
    service.stopPolling();
  });

  it('should start and stop polling', () => {
    service.startPolling(1000);
    expect(service['isPolling']).toBe(true);

    service.stopPolling();
    expect(service['isPolling']).toBe(false);
  });

  it('should update mappings', async () => {
    await service['updateMappings']();
    expect(mockStore.get('1')).toBe('FOOTBALL');
    expect(mockStore.get('2')).toBe('BASKETBALL');
  });

  it('should transform events', () => {
    mockStore.set('sport1', 'FOOTBALL');
    mockStore.set('comp1', 'Premier League');
    mockStore.set('status1', 'LIVE');
    mockStore.set('home1', 'Team A');
    mockStore.set('away1', 'Team B');
    mockStore.set('period1', 'CURRENT');

    const event = {
      id: 'event1',
      sportId: 'sport1',
      competitionId: 'comp1',
      startTime: '2024-01-01T00:00:00Z',
      homeCompetitorId: 'home1',
      awayCompetitorId: 'away1',
      statusId: 'status1',
      scores: 'period1@1:0'
    };

    const transformed = service.transformEvent(event);

    expect(transformed).toEqual({
      id: 'event1',
      status: 'LIVE',
      scores: {
        CURRENT: {
          type: 'CURRENT',
          home: '1',
          away: '0'
        }
      },
      startTime: '2024-01-01T00:00:00Z',
      sport: 'FOOTBALL',
      competitors: {
        HOME: { type: 'HOME', name: 'Team A' },
        AWAY: { type: 'AWAY', name: 'Team B' }
      },
      competition: 'Premier League'
    });
  });

  it('should verify event mappings', () => {
    mockStore.set('sport1', 'FOOTBALL');
    mockStore.set('comp1', 'Premier League');
    mockStore.set('status1', 'LIVE');
    mockStore.set('home1', 'Team A');
    mockStore.set('away1', 'Team B');
    mockStore.set('period1', 'CURRENT');

    const validEvent = {
      id: 'event1',
      sportId: 'sport1',
      competitionId: 'comp1',
      statusId: 'status1',
      homeCompetitorId: 'home1',
      awayCompetitorId: 'away1',
      scores: 'period1@1:0'
    };

    expect(() => service.verifyEventMappings(validEvent)).not.toThrow();

    const invalidEvent = {
      id: 'event1',
      sportId: 'invalid',
      competitionId: 'comp1',
      statusId: 'status1',
      homeCompetitorId: 'home1',
      awayCompetitorId: 'away1',
      scores: 'period1@1:0'
    };

    expect(() => service.verifyEventMappings(invalidEvent)).toThrow();
  });

  it('should get mapped scores', () => {
    mockStore.set('period1', 'CURRENT');
    mockStore.set('period2', 'PERIOD_1');

    const scores = service.getMappedScores('period1@1:0|period2@2:1');
    expect(scores).toEqual({
      CURRENT: { type: 'CURRENT', home: '1', away: '0' },
      PERIOD_1: { type: 'PERIOD_1', home: '2', away: '1' }
    });
  });
});
