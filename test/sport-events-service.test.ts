import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventMappingService } from '../src/event-mapping-service';
import { EventStore, HistoricalEventStore } from '../src/storage';
import { SportEventsService } from '../src/sport-events-service';
import { Logger } from '../src/logger';
import { basketballEvent, basketballOdd, EVENT_IDS, footballOdd, mappings, ODDS, removedEvent } from './fixtures';
import { MappingsBuilder, Odd, OddsBuilder, SportEventBuilder } from './test-helpers';

const createTestContext = () => {
  const mockEventStore = new EventStore();
  const mockHistoricalStore = new HistoricalEventStore();

  return {
    mockEventStore,
    mockHistoricalStore,
  };
};

const createEventMappingService = (fetchMappingsMock: any) => {
  return EventMappingService.create({
    fetchMappings: fetchMappingsMock,
  });
};

const setupTest = (fetchEventsMock: any, fetchMappingsMock = vi.fn().mockResolvedValue(mappings)) => {
  const { mockEventStore, mockHistoricalStore } = createTestContext();
  const mockEventMappingService = createEventMappingService(fetchMappingsMock);

  const service = SportEventsService.create({
    fetchEvents: fetchEventsMock,
    eventMappingService: mockEventMappingService,
    eventStore: mockEventStore,
    historicalEventStore: mockHistoricalStore
  });

  return {
    service,
    mockEventMappingService
  };
};

describe('SportEventsService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(Logger, 'info');
    vi.spyOn(Logger, 'debug');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('outputs human-readable sport event', async () => {
    const { service } = setupTest(vi.fn().mockResolvedValue(basketballOdd))
    await vi.advanceTimersByTimeAsync(5000);
    await service.startPolling(1000);
    await vi.advanceTimersByTimeAsync(5000);
    console.log(service.getCurrentEvents())
    expect(service.getCurrentEvents()).toEqual(basketballEvent);
  });

  it('when simulation starts every sport event has PRE status, during the simulation it is changed to LIVE', async () => {
    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(basketballOdd)
      .mockResolvedValueOnce(new OddsBuilder().withOdd(ODDS.BASKETBALL_NO_SCORES).build())
      .mockResolvedValue({ odds: "" })
      .mockResolvedValue(basketballOdd)

    const { service } = setupTest(fetchEvents);

    await service.startPolling(1000);

    expect(service.getCurrentEvents()).toEqual(basketballEvent);

    await vi.advanceTimersByTimeAsync(1000);
    const preEvents = service.getCurrentEvents();
    expect(preEvents[EVENT_IDS.BASKETBALL].status).toBe("PRE");
    expect(preEvents[EVENT_IDS.BASKETBALL].scores).toBe("N/A");

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()[EVENT_IDS.BASKETBALL].status).toBe("LIVE");
  });

  it('should wait until remote API comes back on', async () => {
    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(basketballOdd)
      .mockResolvedValue({ odds: "" })
      .mockResolvedValueOnce(basketballOdd)

    const { service } = setupTest(fetchEvents);
    await service.startPolling(1000);

    expect(service.getCurrentEvents()).toEqual(basketballEvent);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()).toEqual(basketballEvent);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()[EVENT_IDS.BASKETBALL].status).toBe("LIVE");
  });

  it('should skip malformed events', async () => {
    const basketballOddWithMalformedOdds = new OddsBuilder().withOdd(ODDS.BASKETBALL).withOdd(ODDS.MALFORMED_0).withOdd(ODDS.MALFORMED_1).build()
    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(basketballOdd)
      .mockResolvedValueOnce(basketballOddWithMalformedOdds)
      .mockResolvedValueOnce(basketballOdd)
      .mockResolvedValueOnce(basketballOddWithMalformedOdds)

    const { service } = setupTest(fetchEvents);

    await service.startPolling(1000);

    expect(service.getCurrentEvents()).toEqual(basketballEvent);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()).toEqual(basketballEvent);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()).toEqual(basketballEvent);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()).toEqual(basketballEvent);
  });

  it('should log score changes', async () => {
    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(basketballOdd)
      .mockResolvedValueOnce(new OddsBuilder().withOdd(new Odd(
        {
          statusId: 'ac68a563',
          scores: 'e2d12fef@0:1|6c036000@0:1'
        }
      ).stringRepresentation).build());

    const { service } = setupTest(fetchEvents);

    await service.startPolling(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(Logger.info).toHaveBeenLastCalledWith(
      expect.stringMatching("Event score updated")
    );
  });

  it('should log status changes', async () => {
    const apiSportEventWithChangedStatus = new OddsBuilder().withOdd(new Odd({ statusId: 'cb807d14' }).stringRepresentation).build()
    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(basketballOdd)
      .mockResolvedValueOnce(apiSportEventWithChangedStatus);

    const { service } = setupTest(fetchEvents);

    await service.startPolling(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(Logger.info).toHaveBeenLastCalledWith(
      expect.stringMatching("Event status updated")
    );
  });

  it('removed events are stored in-memory but are not displayed to the user', async () => {
    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(basketballOdd)
      .mockResolvedValueOnce(footballOdd);

    const { service } = setupTest(fetchEvents);
    await service.startPolling(1000);
    await vi.advanceTimersByTimeAsync(2000);
    expect(service.getRemovedEvents()).toEqual(removedEvent);
  });

  it('(edge case) fetches from temporal database in case updated property mapping cant be resolved at the moment', async () => {
    const mappingsV1 = new MappingsBuilder().withLiveStatus('custom').build();
    const fetchMappings = vi.fn().mockResolvedValueOnce(new MappingsBuilder().build()).mockResolvedValueOnce(mappingsV1).mockResolvedValue(mappingsV1);
    const fetchEvents = vi.fn().mockResolvedValue(basketballOdd)
    const { service } = setupTest(fetchEvents, fetchMappings);

    await vi.advanceTimersByTimeAsync(5000);
    await service.startPolling(1000);
    await vi.advanceTimersByTimeAsync(5000);

    expect(service.getCurrentEvents()).toEqual(new SportEventBuilder().build());
  })
});
