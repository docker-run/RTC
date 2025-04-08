import {afterEach, beforeAll, describe, expect, it, MockInstance, vi} from 'vitest';
import { SportEventsService } from '../src/sport-events-service';
import { createApp } from '../src/app';
import * as appConfig from '../src/app-config';
import supertest, { SuperTest, Test } from 'supertest';
import { sportEventPropertiesById, basketballEvent, createSportEvent, MALFORMED_EVENT_0, MALFORMED_EVENT_1, MALFORMED_EVENT_0_ID, MALFORMED_EVENT_1_ID, FOOTBALL_SPORT_EVENT } from './test-helpers';
import { Server } from 'http';
import { Logger } from '../src/logger';
import * as express from "express";

describe('Application Integration Tests', async () => {
  let app: express.Express;
  let server: Server;
  let request: SuperTest<Test>
  let fetchMappingsSpy: MockInstance;
  let fetchEventsSpy: MockInstance;
  let sportEventsService: SportEventsService;

  const setupTestApp = async () => {
    const { app: expressApp, sportsEventsService } = await createApp();
    app = expressApp;
    server = app.listen(0);
    request = supertest(app);
    sportEventsService = sportsEventsService;
    return sportsEventsService;
  };


  beforeAll(async () => {
    vi.spyOn(Logger, 'error');
  })

  afterEach(() => {
    server?.close();
    vi.clearAllMocks();
  });

  it("current application state retrieval flow", async () => {
    fetchMappingsSpy = vi.spyOn(appConfig, "fetchMappings").mockResolvedValue(sportEventPropertiesById);
    fetchEventsSpy = vi.spyOn(appConfig, "fetchEvents").mockResolvedValue(basketballEvent);
    await setupTestApp();
    const res = await request.get('/client/state');
    expect(Object.keys(res.body).length).toBe(1)
  })

  it("logs all necessary information about malformed events", async () => {
    vi.useFakeTimers();

    fetchMappingsSpy.mockReturnValue(Promise.resolve(sportEventPropertiesById));
    fetchEventsSpy.mockReturnValueOnce(Promise.resolve(basketballEvent))
      .mockReturnValueOnce(Promise.resolve(FOOTBALL_SPORT_EVENT))
      .mockReturnValueOnce(Promise.resolve({ odds: `${MALFORMED_EVENT_0}\n${MALFORMED_EVENT_1}\n` }));

    await setupTestApp();

    const removedSportEvent = createSportEvent({ status: 'REMOVED' });
    const res = await request.get('/client/state');
    await vi.advanceTimersByTimeAsync(1000)
    expect(sportEventsService.getRemovedEvents()).toEqual(removedSportEvent)
    await vi.advanceTimersByTimeAsync(1000)
    expect(Object.keys(res.body).length).toBe(1);
    expect(Logger.error).toHaveBeenCalledWith(
      `Validation error occurred while processing {eventId=${MALFORMED_EVENT_0_ID}}. Skipping processing event...`,
      new Error("Validation error: missing mapping for {name=competitionId; id=1709900432183}")
    );
    expect(Logger.error).toHaveBeenLastCalledWith(
      `Validation error occurred while processing {eventId=${MALFORMED_EVENT_1_ID}}. Skipping processing event...`,
      new Error("Validation error: missing mapping for {name=sportId; id=qwerty}")
    )
  })
})
