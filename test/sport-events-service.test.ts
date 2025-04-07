import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventMappingService } from '../src/event-mapping-service';
import { EventStore, HistoricalEventStore } from '../src/storage';
import { SportEventsService } from '../src/sport-events-service';
import { Logger } from '../src/logger';

const eventId = '995e0722-4118-4f8e-a517-82f6ea240673';

const createSportEvent = ({
  status = 'LIVE', scores =
  {
    CURRENT: { type: "CURRENT", home: "0", away: "0" },
    PERIOD_1: { type: "PERIOD_1", home: "0", away: "0" }
  }
}) => ({
  [eventId]: {
    id: eventId,
    status,
    scores,
    startTime: '1709900432183',
    sport: 'Basketball',
    competitors: { HOME: { type: "HOME", name: "Brooklyn NETS" }, AWAY: { type: "AWAY", name: "LA Lakers" } },
    competition: 'Premier League'
  }
});

const sportEvent = createSportEvent({});
const removedSportEvent = createSportEvent({ status: 'REMOVED' });

const createApiSportEvent = ({ status = 'ac68a563-e511-4776-b2ee-cd395c7dc424', scores = 'e2d12fef-ae82-4a35-b389-51edb8dc664e@0:0|6c036000-6dd9-485d-97a1-e338e6a32a51@0:0' }) => ({
  "odds": `${eventId},c0a1f678-dbe5-4cc8-aa52-8c822dc65267,7ee17545-acd2-4332-869b-1bef06cfaec8,1709900432183,29190088-763e-4d1c-861a-d16dbfcf858c,3cd8eeee-a57c-48a3-845f-93b561a95782,${status},${scores}\n`
});

const apiSportEvent = createApiSportEvent({});

const createMappings = ({
  liveStatus = "ac68a563-e511-4776-b2ee-cd395c7dc424"
}) => {
  return { "mappings": `c0a1f678-dbe5-4cc8-aa52-8c822dc65267:Basketball;7ee17545-acd2-4332-869b-1bef06cfaec8:Premier League;29190088-763e-4d1c-861a-d16dbfcf858c:Brooklyn NETS;3cd8eeee-a57c-48a3-845f-93b561a95782:LA Lakers;${liveStatus}:LIVE;cb807d14-5a98-4b41-8ddc-74a1f5f80f9b:REMOVED;5d8040b7-0331-43ac-8051-03913e2c3a5d:PRE;cb807d14-5a98-4b41-8ddc-74a1f5f80f9b:REMOVED;e2d12fef-ae82-4a35-b389-51edb8dc664e:CURRENT;6c036000-6dd9-485d-97a1-e338e6a32a51:PERIOD_1;2db8bc38-b46d-4bd9-9218-6f8dbe083517:PERIOD_2;0cfb491c-7d09-4ffc-99fb-a6ee0cf5d198:PERIOD_3;5a79d3e7-85b3-4d6b-b4bf-ddd743e7162f:PERIOD_4` }
}

const apiMappings = createMappings({});

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

const setupTest = (fetchEventsMock: any, fetchMappingsMock = vi.fn().mockResolvedValue(apiMappings)) => {
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
    const { service } = setupTest(vi.fn().mockResolvedValue(apiSportEvent));

    await vi.advanceTimersByTimeAsync(5000);
    await service.startPolling(1000);
    await vi.advanceTimersByTimeAsync(5000);

    expect(service.getCurrentEvents()).toEqual(sportEvent);
  });

  it('when simulation starts every sport event has PRE status, during the simulation it is changed to LIVE', async () => {
    const apiSportEventNoScores = {
      "odds": `${eventId},c0a1f678-dbe5-4cc8-aa52-8c822dc65267,7ee17545-acd2-4332-869b-1bef06cfaec8,1709900432183,29190088-763e-4d1c-861a-d16dbfcf858c,3cd8eeee-a57c-48a3-845f-93b561a95782,ac68a563-e511-4776-b2ee-cd395c7dc424\n`
    };

    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(apiSportEvent)
      .mockResolvedValueOnce(apiSportEventNoScores)
      .mockResolvedValue({ odds: "" })
      .mockResolvedValue(apiSportEvent);

    const { service } = setupTest(fetchEvents);

    await service.startPolling(1000);

    expect(service.getCurrentEvents()).toEqual(sportEvent);

    await vi.advanceTimersByTimeAsync(1000);
    const preEvents = service.getCurrentEvents();
    expect(preEvents[eventId].status).toBe("PRE");
    expect(preEvents[eventId].scores).toBe("N/A");

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()[eventId].status).toBe("LIVE");
  });

  it('should wait until remote API comes back on', async () => {
    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(apiSportEvent)
      .mockResolvedValue({ odds: "" })
      .mockResolvedValue(apiSportEvent);

    const { service } = setupTest(fetchEvents);
    await service.startPolling(1000);

    expect(service.getCurrentEvents()).toEqual(sportEvent);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()).toEqual(sportEvent);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getCurrentEvents()[eventId].status).toBe("LIVE");
  });

  it('should skip malformed events', async () => {
    const malformedEvent0 = `${eventId},7ee17545-acd2-4332-869b-1bef06cfaec8,1709900432183,29190088-763e-4d1c-861a-d16dbfcf858c,3cd8eeee-a57c-48a3-845f-93b561a95782,ac68a563-e511-4776-b2ee-cd395c7dc424,e2d12fef-ae82-4a35-b389-51edb8dc664e@0:0|6c036000-6dd9-485d-97a1-e338e6a32a51@0:0`;
    const malformedEvent1 = `${eventId},qwerty`;
    const apiSportEventWithMalformedEvents = {
      "odds": `${eventId},c0a1f678-dbe5-4cc8-aa52-8c822dc65267,7ee17545-acd2-4332-869b-1bef06cfaec8,1709900432183,29190088-763e-4d1c-861a-d16dbfcf858c,3cd8eeee-a57c-48a3-845f-93b561a95782,ac68a563-e511-4776-b2ee-cd395c7dc424,e2d12fef-ae82-4a35-b389-51edb8dc664e@0:0|6c036000-6dd9-485d-97a1-e338e6a32a51@0:0\n${malformedEvent0}\n${malformedEvent1}`
    };

    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(apiSportEvent)
      .mockResolvedValueOnce(apiSportEventWithMalformedEvents)
      .mockResolvedValueOnce(apiSportEvent)
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
      .mockResolvedValueOnce(apiSportEvent)
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
      .mockResolvedValueOnce(apiSportEvent)
      .mockResolvedValueOnce(apiSportEventWithChangedStatus);

    const { service } = setupTest(fetchEvents);

    await service.startPolling(1000);
    await vi.advanceTimersByTimeAsync(1000);

    expect(Logger.info).toHaveBeenLastCalledWith(
      expect.stringMatching("Event status updated")
    );
  });

  it('removed events are stored in-memory but are not displayed to the user', async () => {
    const otherSportEvent = {
      "odds": `da44bd9f-a1b0-4f36-b50f-4cc2acf75b21,c0a1f678-dbe5-4cc8-aa52-8c822dc65267,7ee17545-acd2-4332-869b-1bef06cfaec8,1709900432183,29190088-763e-4d1c-861a-d16dbfcf858c,3cd8eeee-a57c-48a3-845f-93b561a95782,ac68a563-e511-4776-b2ee-cd395c7dc424,e2d12fef-ae82-4a35-b389-51edb8dc664e@0:0|6c036000-6dd9-485d-97a1-e338e6a32a51@0:0\n`
    };

    const fetchEvents = vi.fn()
      .mockResolvedValueOnce(apiSportEvent)
      .mockResolvedValueOnce(otherSportEvent);

    const { service } = setupTest(fetchEvents);
    await vi.advanceTimersByTimeAsync(5000);
    await service.startPolling(1000);

    expect(service.getCurrentEvents()).toEqual(sportEvent);

    await vi.advanceTimersByTimeAsync(1000);
    expect(service.getRemovedEvents()).toEqual(removedSportEvent);
  });

  it('(edge case) fetches from temporal database in case updated property mapping cant be resolved at the moment', async () => {
    const apiMappingsV1 = createMappings({ liveStatus: "changed_live_status" })
    const fetchMappings = vi.fn().mockResolvedValueOnce(apiMappings).mockResolvedValueOnce(apiMappingsV1).mockResolvedValue(apiMappingsV1);
    const fetchEvents = vi.fn().mockResolvedValue(apiSportEvent)
    const { service } = setupTest(fetchEvents, fetchMappings);

    await vi.advanceTimersByTimeAsync(5000);
    await service.startPolling(1000);
    await vi.advanceTimersByTimeAsync(5000);

    expect(service.getCurrentEvents()).toEqual(sportEvent);
  })
});
