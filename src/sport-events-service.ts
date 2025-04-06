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
  changeTimestamp: string;
  eventId: string;
  oldStatusId: string;
  newStatusId: string;
}

interface ILogScoreChangeParams {
  awayCompetitorId: string;
  competitionId: string;
  changeTimestamp: string;
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

  private async updateEvents() {
    try {
      const eventsData = await this.fetchEvents();
      await this.updateEventStore(eventsData.odds);
    } catch (error) {
      Logger.error("Update sport event store error", error);
    }
  }

  private async updateEventStore(odds?: string) {
    if (!odds) {
      Logger.debug('No odds exist. Skipping event updates...');
      return;
    }

    const currentEventIds = new Set<string>();

    const sportsEvents = odds.split("\n");

    for (const sportEvent of sportsEvents) {
      const changeTimestamp = new Date().toISOString();

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
        Logger.warn(`Missing eventId. {timestamp=${changeTimestamp}}. Skipping event...`);
        continue;
      }

      const effectiveScores = scores || "N/A";
      let effectiveStatus = statusId

      if (!scores) {
        const pre = this.eventMappingService.getIdByValue("PRE");

        if (!pre) {
          Logger.warn(`Missing PRE mapping for unscored event {eventId=${eventId}}. Skipping event...`);
          continue;
        }
        effectiveStatus = pre;
      }

      try {
        this.eventMappingService.verifyEventMappings({
          id: eventId,
          sportId,
          competitionId,
          statusId: effectiveStatus,
          homeCompetitorId,
          awayCompetitorId,
          scores: effectiveScores
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
        this.logStatusChange({ eventId, oldStatusId: existingEvent.statusId, newStatusId: effectiveStatus, changeTimestamp });
        existingEvent.statusId = effectiveStatus;
      }

      if (existingEvent.scores !== effectiveScores) {
        try {
          const oldScores = this.eventMappingService.getMappedScores(existingEvent.scores, changeTimestamp);
          const newScores = this.eventMappingService.getMappedScores(effectiveScores);

          Object.keys(newScores).forEach(period => {
            if (!newScores[period]) {
              Logger.debug(`Missing scores for {period=${period}; eventId=${eventId}; timestamp=${changeTimestamp}}. Score remains unchanged..`);
              return
            };

            const oldPeriod = oldScores[period] || { home: '0', away: '0' };
            const newPeriod = newScores[period];

            if (oldPeriod.type === newPeriod.type && oldPeriod.home === newPeriod.home && oldPeriod.away === newPeriod.away) {
              Logger.debug(`Score remains unchanged {period=${oldPeriod.type} eventId=${eventId}; timestamp=${changeTimestamp}}`);
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
              changeTimestamp
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

  private logStatusChange({ eventId, oldStatusId, newStatusId, changeTimestamp }: ILogStatusChangeParams) {
    try {
      const oldStatus = this.eventMappingService.getMappedName(oldStatusId, changeTimestamp);
      const newStatus = this.eventMappingService.getMappedName(newStatusId);
      Logger.info(`Event status updated {eventId=${eventId}; timestamp=${new Date(changeTimestamp).toISOString()}}; ${oldStatus} → ${newStatus}`);
    } catch (error) {
      Logger.error(`Error getting status change mappings {eventId=${eventId}}`, error);
    }
  }

  private logScoreChange({
    awayCompetitorId,
    competitionId,
    changeTimestamp,
    eventId,
    homeCompetitorId,
    oldHome,
    oldAway,
    period,
    newHome,
    newAway,
  }: ILogScoreChangeParams) {
    const mappedCompetitors = this.eventMappingService.getMappedCompetitors(homeCompetitorId, awayCompetitorId, changeTimestamp);

    Logger.info(`Event score updated {eventId=${eventId}; timestamp=${new Date(changeTimestamp).toISOString()}; competition=${this.eventMappingService.getMappedName(competitionId)}; period=${period}; ${oldHome}-${oldAway} → ${newHome}-${newAway}; competitors=${mappedCompetitors["HOME"].name} VS ${mappedCompetitors["AWAY"].name}}`);
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
