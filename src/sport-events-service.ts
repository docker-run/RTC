import { EventMappingService } from "./event-mapping-service";
import { Logger } from "./logger";
import { PollingService } from "./polling-service";
import { EventStore, HistoricalEventStore } from "./storage";
import { FetchEventsFn } from "./types";

interface ILogLifecycleChangeParams {
  eventId: string;
  statusId: string;
  sportId: string;
  competitionId: string;
  action: "Created" | "Updated" | "Removed";
}

interface ILogStatusChangeParams {
  timestamp: string;
  eventId: string;
  oldStatusId: string;
  newStatusId: string;
}

interface ILogScoreChangeParams {
  awayCompetitorId: string;
  competitionId: string;
  timestamp: string;
  eventId: string;
  homeCompetitorId: string;
  oldHome: string;
  oldAway: string;
  period: string;
  newHome: string;
  newAway: string;
}

type SportEventsServiceArgs = {
  eventMappingService: EventMappingService;
  eventStore: EventStore;
  fetchEvents: FetchEventsFn;
  historicalEventStore: HistoricalEventStore;
}

export class SportEventsService {
  private readonly eventMappingService: EventMappingService;
  private readonly eventStore: EventStore;
  private readonly fetchEvents: FetchEventsFn;
  private readonly historicalEventStore: HistoricalEventStore;

  private isEmptyOdds: boolean;

  private pollingService: PollingService;

  public static create(args: SportEventsServiceArgs) {
    return new this(args);
  }

  protected constructor({ fetchEvents, eventStore, eventMappingService, historicalEventStore }: SportEventsServiceArgs) {
    this.eventStore = eventStore;
    this.eventMappingService = eventMappingService;
    this.fetchEvents = fetchEvents;
    this.historicalEventStore = historicalEventStore;

    this.pollingService = PollingService.create({
      task: this.updateEvents.bind(this),
      intervalMs: 0,
      taskName: 'sport events',
      errorHandler: (error) => Logger.error("Update sport event store error", error)
    });
  }

  async startPolling(intervalMs: number) {
    this.pollingService.setInterval(intervalMs);
    await this.pollingService.startPolling();
  }

  async stopPolling() {
    this.pollingService.stopPolling();
  }

  private async refreshMappings(timestamp: string) {
    let attempts = 0;
    const MAX_ATTEMPTS = 3;
    const BASE_DELAY = 1000;

    while (attempts < MAX_ATTEMPTS) {
      try {
        await this.eventMappingService.updateMappings(timestamp)
        return;
      } catch (error) {
        attempts++;
        if (attempts >= MAX_ATTEMPTS) {
          Logger.error('Max retries exceeded for mappings refresh');
          throw error;
        }
        await new Promise(resolve =>
            setTimeout(resolve, BASE_DELAY * Math.pow(2, attempts)));
      }
    }
  }

  private async updateEvents() {
    const timestamp = new Date().toISOString();
    const version = this.eventMappingService.getMappingsVersion()

    if (version === 0) {
      await this.refreshMappings(timestamp);
    }

    try {
      const eventsData = await this.fetchEvents();
      const odds = eventsData.odds;

      if (!odds) {
        this.isEmptyOdds = true;
        Logger.debug(`Odds API is restarting. {timestamp=${timestamp}}`);
        return;
      }

      if (this.isEmptyOdds) {
        await this.refreshMappings(timestamp);
        this.isEmptyOdds = false;
      }

      await this.updateEventStore(odds);
    } catch (error) {
      Logger.error("Update sport event store error", error);
    }
  }

  private async updateEventStore(odds: string) {
    const timestamp = new Date().toISOString();

    const currentEventIds = new Set<string>();

    const sportsEvents = odds.split("\n");

    for (const sportEvent of sportsEvents) {
      const [
        eventId,
        sportId,
        competitionId,
        startTime,
        homeCompetitorId,
        awayCompetitorId,
        statusId,
        scores
      ] = sportEvent.split(',');

      if (!eventId) {
        Logger.warn(`Missing eventId. {timestamp=${timestamp}}. Skipping event...`);
        continue;
      }

      let effectiveScores: string, effectiveStatus: string;

      if (!scores) {
        const pre = this.eventMappingService.getIdByValue("PRE");

        if (!pre) {
          Logger.warn(`Missing PRE mapping for upcoming event {eventId=${eventId}}. Skipping processing event...`);
          continue;
        }
        effectiveStatus = pre;
        effectiveScores =  "N/A";
      } else {
        effectiveScores = scores;
        effectiveStatus = statusId;
      }

      try {
        this.eventMappingService.verifyEventMappings({
          id: eventId,
          sportId,
          competitionId,
          statusId: effectiveStatus,
          homeCompetitorId,
          awayCompetitorId,
          scores:  effectiveScores,
        });
      } catch (error) {
        Logger.error(`Validation error occurred while processing {eventId=${eventId}}. Skipping processing event...`, error);
        continue;
      }

      currentEventIds.add(eventId);

      const existingEvent = this.eventStore.get(eventId);

      if (!existingEvent) {
        this.eventStore.set(eventId, {
          id: eventId,
          sportId,
          competitionId,
          startTime,
          homeCompetitorId,
          awayCompetitorId,
          statusId: effectiveStatus,
          scores: effectiveScores
        })

        this.logLifecycleChange({ action: "Created", competitionId, eventId, statusId, sportId });

        continue;
      }

      if (existingEvent.statusId !== effectiveStatus) {
        this.logStatusChange({ eventId, oldStatusId: existingEvent.statusId, newStatusId: effectiveStatus, timestamp });
        existingEvent.statusId = effectiveStatus;
      }

      if (existingEvent.scores !== effectiveScores) {
        try {
          const oldScores = this.eventMappingService.getMappedScores(existingEvent.scores);
          const newScores = this.eventMappingService.getMappedScores(effectiveScores);

          Object.keys(newScores).forEach(period => {
            if (!newScores[period]) {
              Logger.debug(`Missing scores for {period=${period}; eventId=${eventId}; timestamp=${timestamp}}. Score remains unchanged.`);
              return
            }

            const oldPeriod = oldScores[period] || { home: '0', away: '0' };
            const newPeriod = newScores[period];

            if (oldPeriod.type === newPeriod.type && oldPeriod.home === newPeriod.home && oldPeriod.away === newPeriod.away) {
              Logger.debug(`Score remains unchanged {period=${oldPeriod.type} eventId=${eventId}; timestamp=${timestamp}}`);
              return;
            }

            this.logScoreChange({
              competitionId,
              homeCompetitorId: existingEvent.homeCompetitorId,
              awayCompetitorId: existingEvent.awayCompetitorId,
              eventId,
              period,
              oldHome: oldPeriod.home || '0',
              oldAway: oldPeriod.away || '0',
              newHome: newPeriod.home || '0',
              newAway: newPeriod.away || '0',
              timestamp
            });
          });

          existingEvent.scores = effectiveScores;
        } catch (error) {
          Logger.error(`Error processing score changes for event {eventId=${eventId}}. Skipping processing event...`, error);
        }
      }
    }

    this.handleRemovedEvents(currentEventIds);
  }

  private handleRemovedEvents(currentEventIds: Set<string>) {
    const allEvents = this.eventStore.getAll();

    for (const storedId of Object.keys(allEvents)) {
      if (!currentEventIds.has(storedId)) {
        const event = allEvents[storedId];
        const transformedEvent = this.eventMappingService.transformEvent(event);

        if (!transformedEvent) {
          Logger.error(`Cannot create historical snapshot {eventId=${storedId}}. Skipping processing event...`);
          continue
        }

        this.historicalEventStore.add({
          ...transformedEvent,
          status: 'REMOVED',
        });

        this.eventStore.delete(storedId);

        Logger.debug(`Removed event {eventId=${storedId}}`)
      }
    }
  }

  public getCurrentEvents() {
    return this.eventMappingService.transformEvents(this.eventStore.getAll())
  }

  public getRemovedEvents() {
    return this.historicalEventStore.getAll()
  }

  private logStatusChange({ eventId, oldStatusId, newStatusId, timestamp }: ILogStatusChangeParams) {
    try {
      const oldStatus = this.eventMappingService.getMappedName(oldStatusId);
      const newStatus = this.eventMappingService.getMappedName(newStatusId);
      Logger.info(`Event status updated {eventId=${eventId}; timestamp=${timestamp}}; ${oldStatus} → ${newStatus}`);
    } catch (error) {
      Logger.error(`Error getting status change mappings {eventId=${eventId}}`, error);
    }
  }

  private logScoreChange({
    awayCompetitorId,
    competitionId,
    timestamp,
    eventId,
    homeCompetitorId,
    oldHome,
    oldAway,
    period,
    newHome,
    newAway,
  }: ILogScoreChangeParams) {
    const mappedCompetitors = this.eventMappingService.getMappedCompetitors(homeCompetitorId, awayCompetitorId);

    Logger.info(`Event score updated {eventId=${eventId}; timestamp=${timestamp}; competition=${this.eventMappingService.getMappedName(competitionId)}; period=${period}; ${oldHome}-${oldAway} → ${newHome}-${newAway}; competitors=${mappedCompetitors["HOME"].name} VS ${mappedCompetitors["AWAY"].name}}`);
  }

  private logLifecycleChange({
    eventId,
    statusId,
    sportId,
    competitionId,
    action
  }: ILogLifecycleChangeParams) {
    Logger.info(`${action} event {eventId=${eventId}; competition=${this.eventMappingService.getMappedName(competitionId)}; status=${this.eventMappingService.getMappedName(statusId)}; sport=${this.eventMappingService.getMappedName(sportId)}}`)
  }
}
