import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventMappingService } from '../src/event-mapping-service';
import { EventStore, HistoricalEventStore } from '../src/storage';
import { SportEventsService } from '../src/sport-events-service';
import { Logger } from '../src/logger';
import { MALFORMED_EVENT_0, MALFORMED_EVENT_1, FOOTBALL_SPORT_EVENT, BASKETBALL_EVENT_ID, createMappings, sportEventPropertiesById, basketballEvent, sportEvent, createApiSportEvent, removedSportEvent } from './test-helpers';

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

const setupTest = (fetchEventsMock: any, fetchMappingsMock = vi.fn().mockResolvedValue(sportEventPropertiesById)) => {
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
    const { service } = setupTest(vi.fn().mockResolvedValue(basketballEvent));

    await vi.advanceTimersByTimeAsync(5000);
    await service.startPolling(1000);
    await vi.advanceTimersByTimeAsync(5000);

    expect(service.getCurrentEvents()).toEqual(sportEvent);
  });

  it('when simulation starts every sport event has PRE status, during the simulation it is changed to LIVE', async () => {
    const apiSportEventNoScores = {
      "odds": `${BASKETBALL_EVENT_ID},c0a1f678-dbe5-4cc8-aa52-8c822dc65267,7ee17545-acd2-4332-869b-1bef06cfaec8,1709900432183,29190088-763e-4d1c-861a-d16dbfcf858c,3cd8eeee-a57c-48a3-845f-93b561a95782,ac68a563-e511-4776-b2ee-cd395c7dc424\n`
    };

    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(basketballEvent)
      .mockResolvedValueOnce(apiSportEventNoScores)
      .mockResolvedValue({ odds: "" })
      .mockResolvedValue(basketballEvent);

    const { service } = setupTest(fetchEvents);

    await service.startPolling(1000);

    expect(service.getCurrentEvents()).toEqual(sportEvent);

    await vi.advanceTimersByTimeAsync(1000);
    const preEvents = service.getCurrentEvents();
    expect(preEvents[BASKETBALL_EVENT_ID].status).toBe("PRE");
    expect(preEvents[BASKETBALL_EVENT_ID].scores).toBe("N/A");

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()[BASKETBALL_EVENT_ID].status).toBe("LIVE");
  });

  it('should wait until remote API comes back on', async () => {
    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(basketballEvent)
      .mockResolvedValue({ odds: "" })
      .mockResolvedValue(basketballEvent);

    const { service } = setupTest(fetchEvents);
    await service.startPolling(1000);

    expect(service.getCurrentEvents()).toEqual(sportEvent);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()).toEqual(sportEvent);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()[BASKETBALL_EVENT_ID].status).toBe("LIVE");
  });

  it('should skip malformed events', async () => {
    const apiSportEventWithMalformedEvents = {
      "odds": `${BASKETBALL_EVENT_ID},c0a1f678-dbe5-4cc8-aa52-8c822dc65267,7ee17545-acd2-4332-869b-1bef06cfaec8,1709900432183,29190088-763e-4d1c-861a-d16dbfcf858c,3cd8eeee-a57c-48a3-845f-93b561a95782,ac68a563-e511-4776-b2ee-cd395c7dc424,e2d12fef-ae82-4a35-b389-51edb8dc664e@0:0|6c036000-6dd9-485d-97a1-e338e6a32a51@0:0\n${MALFORMED_EVENT_0}\n${MALFORMED_EVENT_1}`
    };

    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(basketballEvent)
      .mockResolvedValueOnce(apiSportEventWithMalformedEvents)
      .mockResolvedValueOnce(basketballEvent)
      .mockResolvedValue(apiSportEventWithMalformedEvents);

    const { service } = setupTest(fetchEvents);

    await service.startPolling(1000);

    expect(service.getCurrentEvents()).toEqual(sportEvent);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()).toEqual(sportEvent);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()).toEqual(sportEvent);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()).toEqual(sportEvent);
  });

  it('should log score changes', async () => {
    const apiSportEventWithChangedScore = createApiSportEvent({ status: 'ac68a563-e511-4776-b2ee-cd395c7dc424', scores: 'e2d12fef-ae82-4a35-b389-51edb8dc664e@0:1|6c036000-6dd9-485d-97a1-e338e6a32a51@0:1' });
    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(basketballEvent)
      .mockResolvedValueOnce(apiSportEventWithChangedScore);

    const { service } = setupTest(fetchEvents);

    await service.startPolling(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(Logger.info).toHaveBeenLastCalledWith(
      expect.stringMatching("Event score updated")
    );
  });

  it('should log status changes', async () => {
    const apiSportEventWithChangedStatus = createApiSportEvent({ status: 'cb807d14-5a98-4b41-8ddc-74a1f5f80f9b' });
    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(basketballEvent)
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
      .mockResolvedValueOnce(basketballEvent)
      .mockResolvedValueOnce(FOOTBALL_SPORT_EVENT);

    const { service } = setupTest(fetchEvents);
    await vi.advanceTimersByTimeAsync(5000);
    await service.startPolling(1000);

    expect(service.getCurrentEvents()).toEqual(sportEvent);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getRemovedEvents()).toEqual(removedSportEvent);
  });

  it('(edge case) fetches from temporal database in case updated property mapping cant be resolved at the moment', async () => {
    const apiMappingsV1 = createMappings({ liveStatus: "changed_live_status" })
    const fetchMappings = vi.fn().mockResolvedValueOnce(sportEventPropertiesById).mockResolvedValueOnce(apiMappingsV1).mockResolvedValue(apiMappingsV1);
    const fetchEvents = vi.fn().mockResolvedValue(basketballEvent)
    const { service } = setupTest(fetchEvents, fetchMappings);

    await vi.advanceTimersByTimeAsync(5000);
    await service.startPolling(1000);
    await vi.advanceTimersByTimeAsync(5000);

    expect(service.getCurrentEvents()).toEqual(sportEvent);
  })
});
