import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventMappingService} from "../src/event-mapping-service";
import { Logger} from "../src/logger";
import { PersistedSportEvent} from "../src/types";

// Mock the Logger to suppress logs during testing
vi.mock('./logger', () => ({
  Logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('EventMappingService', () => {
  let mappingService: EventMappingService;
  const mockFetchMappings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger, 'debug');
    vi.spyOn(Logger, 'error');
    vi.spyOn(Logger, 'warn');

    mappingService = EventMappingService.create({
      fetchMappings: mockFetchMappings,
    });
  });

  describe('create', () => {
    it('should create an instance with provided dependencies', () => {
      expect(mappingService).toBeInstanceOf(EventMappingService);
    });
  });

  describe('updateMappings', () => {
    it('should update mappings when valid data is received', async () => {
      const testMappings = 'sport1:Football;comp1:Premier League';
      mockFetchMappings.mockResolvedValue({ mappings: testMappings });

      await mappingService.updateMappings('2025-01-01');

      expect(mockFetchMappings).toHaveBeenCalled();
      expect(Logger.debug).toHaveBeenCalledWith(
          'Updated mappings cache on demand {timestamp=2025-01-01}'
      );
      expect(mappingService['mappings']).toEqual({
        sport1: 'Football',
        comp1: 'Premier League',
      });
    });

    it('should handle empty mappings', async () => {
      mockFetchMappings.mockResolvedValue({ mappings: undefined });

      await mappingService.updateMappings('2025-01-01');

      expect(Logger.warn).toHaveBeenCalledWith(
          'No mappings found. Skipping cache update...'
      );
    });

    it('should handle fetch errors', async () => {
      mockFetchMappings.mockRejectedValue(new Error('Network error'));

      await mappingService.updateMappings('2025-01-01');

      expect(Logger.error).toHaveBeenCalledWith(
          'Update mappings cache error',
          expect.any(Error)
      );
    });
  });

  describe('parseMappingsString', () => {
    it('should parse valid mappings string', () => {
      const result = mappingService['parseMappingsString'](
          'id1:Value 1;id2:Value 2'
      );
      expect(result).toEqual({
        id1: 'Value 1',
        id2: 'Value 2',
      });
    });

    it('should ignore malformed entries', () => {
      const result = mappingService['parseMappingsString'](
          'id1:Value 1;malformed;id2:Value 2'
      );
      expect(result).toEqual({
        id1: 'Value 1',
        id2: 'Value 2',
      });
    });

    it('should handle empty string', () => {
      const result = mappingService['parseMappingsString']('');
      expect(result).toEqual({});
    });
  });

  describe('transformEvent', () => {
    beforeEach(() => {
      mappingService['mappings'] = {
        sport1: 'Football',
        comp1: 'Premier League',
        status1: 'Live',
        team1: 'Arsenal',
        team2: 'Chelsea',
        period1: '1st Half',
        period2: '2nd Half',
      };
    });

    it('should transform a complete event', () => {
      const event: PersistedSportEvent = {
        id: 'event1',
        sportId: 'sport1',
        competitionId: 'comp1',
        startTime: '2025',
        homeCompetitorId: 'team1',
        awayCompetitorId: 'team2',
        statusId: 'status1',
        scores: 'period1@1:0|period2@2:1',
      };

      const result = mappingService.transformEvent(event);
      expect(result).toEqual({
        id: 'event1',
        status: 'Live',
        startTime: '2025',
        sport: 'Football',
        competition: 'Premier League',
        competitors: {
          HOME: { type: 'HOME', name: 'Arsenal' },
          AWAY: { type: 'AWAY', name: 'Chelsea' },
        },
        scores: {
          '1st Half': { type: '1st Half', home: '1', away: '0' },
          '2nd Half': { type: '2nd Half', home: '2', away: '1' },
        },
      });
    });

    it('should handle N/A scores', () => {
      const event: PersistedSportEvent = {
        id: 'event1',
        sportId: 'sport1',
        competitionId: 'comp1',
        startTime: '2025',
        homeCompetitorId: 'team1',
        awayCompetitorId: 'team2',
        statusId: 'status1',
        scores: 'N/A',
      };

      const result = mappingService.transformEvent(event);
      expect(result?.scores).toBe('N/A');
    });

    it('should return null when mapping fails', () => {
      const event: PersistedSportEvent = {
        id: 'event1',
        sportId: 'missing-sport',
        competitionId: 'comp1',
        startTime: '2025',
        homeCompetitorId: 'team1',
        awayCompetitorId: 'team2',
        statusId: 'status1',
        scores: 'period1@1:0',
      };

      const result = mappingService.transformEvent(event);
      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('verifyEventMappings', () => {
    beforeEach(() => {
      mappingService['mappings'] = {
        sport1: 'Football',
        comp1: 'Premier League',
        status1: 'Live',
        team1: 'Arsenal',
        team2: 'Chelsea',
        period1: '1st Half',
      };
    });

    it('should throw for missing sport mapping', () => {
      mappingService['mappingsCache'] = new Map([
        [0, {
          sport1: 'Football',
          comp1: 'Premier League',
          status1: 'Live',
          team1: 'Arsenal',
          team2: 'Chelsea',
          period1: '1st Half',
        }],
      ]);
      const event = {
        id: 'event1',
        sportId: 'missing-sport',
        competitionId: 'comp1',
        statusId: 'status1',
        homeCompetitorId: 'team1',
        awayCompetitorId: 'team2',
        scores: 'period1@1:0',
      };

      expect(() => mappingService.verifyEventMappings(event)).toThrow(
          'Validation error: missing mapping for {name=sportId; id=missing-sport}'
      );
    });

    it('should throw for missing score period mapping', () => {
      mappingService['mappingsCache'] = new Map([[0, {
        sport1: 'Football',
        comp1: 'Premier League',
        status1: 'Live',
        team1: 'Arsenal',
        team2: 'Chelsea',
        period1: '1st Half'
      }]]);

      const event = {
        id: 'event1',
        sportId: 'sport1',
        competitionId: 'comp1',
        statusId: 'status1',
        homeCompetitorId: 'team1',
        awayCompetitorId: 'team2',
        scores: 'missing-period@1:0',
      };

      expect(() => mappingService.verifyEventMappings(event)).toThrow(
          'Validation error: missing mapping for score periodType={missing-period}'
      );
    });
  });

  describe('getMappedName', () => {
    beforeEach(() => {
      mappingService['mappings'] = { current: 'Current Value' };
      mappingService['mappingsCache'] = new Map([[1, { key: 'value' }], [2, { key: 'Version 2 Value' }], [3, { key: 'Version 3 Value' }]]);
      mappingService['mappingsVersion'] = 4;
    });

    it('should return value from current mappings', () => {
      expect(mappingService.getMappedName('current')).toBe('Current Value');
    });

    it('should fall back to previous versions', () => {
      expect(mappingService.getMappedName('key')).toBe('Version 3 Value');
    });

    it('should throw when value not found', () => {
      expect(() => mappingService.getMappedName('missing')).toThrow(
          'Validation error: Missing mapping for {id=missing} in current or last 3 versions'
      );
    });
  });

  describe('getIdByValue', () => {
    beforeEach(() => {
      mappingService['mappings'] = {
        id1: 'Football',
        id2: 'Basketball',
      };
    });

    it('should return ID for matching value', () => {
      expect(mappingService.getIdByValue('Football')).toBe('id1');
      expect(mappingService.getIdByValue('BASKETBALL')).toBe('id2'); // case insensitive
    });

    it('should throw when value not found', () => {
      expect(() => mappingService.getIdByValue('Tennis')).toThrow(
          'No ID found for value: Tennis'
      );
    });
  });

  describe('getMappingsByVersion', () => {
    it('should return mappings for existing version', () => {
      mappingService['mappingsCache'] = new Map([[1, { key: 'value' }]]);
      expect(mappingService.getMappingsByVersion(1)).toEqual({ key: 'value' });
    });

    it('should return undefined for non-existent version', () => {
      expect(mappingService.getMappingsByVersion(999)).toBeUndefined();
    });
  });
});
