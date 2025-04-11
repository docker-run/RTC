import { afterEach, beforeAll, describe, expect, it, MockInstance, vi } from 'vitest';
import { SportEventsService } from '../src/sport-events-service';
import { createApp } from '../src/app';
import * as appConfig from '../src/app-config';
import supertest, { SuperTest, Test } from 'supertest';
import { Server } from 'http';
import { Logger } from '../src/logger';
import * as express from "express";
import { basketballOdd, EVENT_IDS, footballOdd, malformedOdds, mappings, removedEvent } from "./fixtures";

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
    fetchMappingsSpy = vi.spyOn(appConfig, "fetchMappings").mockResolvedValue(mappings);
    fetchEventsSpy = vi.spyOn(appConfig, "fetchEvents").mockResolvedValue(basketballOdd);
    await setupTestApp();
    const res = await request.get('/client/state');
    expect(Object.keys(res.body).length).toBe(1)
  })

  it("logs all necessary information about malformed events", async () => {
    vi.useFakeTimers();
    fetchMappingsSpy.mockReturnValue(Promise.resolve(mappings));
    fetchEventsSpy.mockReturnValueOnce(Promise.resolve(basketballOdd))
      .mockReturnValueOnce(Promise.resolve(footballOdd))
      .mockReturnValueOnce(Promise.resolve(malformedOdds));

    await setupTestApp();

    const res = await request.get('/client/state');
    await vi.advanceTimersByTimeAsync(1000)
    expect(sportEventsService.getRemovedEvents()).toEqual(removedEvent)
    await vi.advanceTimersByTimeAsync(1000)
    expect(Object.keys(res.body).length).toBe(1);
    expect(Logger.error).toHaveBeenCalledWith(
      `Validation error occurred while processing {eventId=${EVENT_IDS.MALFORMED_0}}. Skipping processing event...`,
      new Error("Validation error: missing mapping for {name=competitionId; id=1709900432183}")
    );
    expect(Logger.error).toHaveBeenLastCalledWith(
      `Validation error occurred while processing {eventId=${EVENT_IDS.MALFORMED_1}}. Skipping processing event...`,
      new Error("Validation error: missing mapping for {name=sportId; id=qwerty}")
    )
  })
})
