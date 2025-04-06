import { Logger } from "./logger";
import { PollingService } from "./polling-service";
import { ITemporalMappingStore } from "./storage";
import { FetchMappingsFn, PersistedSportEvent, SportEvent, SportEventScores } from "./types";

export type EventMappingServiceArgs = {
  fetchMappings: FetchMappingsFn;
  mappingStore: ITemporalMappingStore;
}

export class EventMappingService {
  private readonly fetchMappings: FetchMappingsFn;
  private readonly mappingStore: ITemporalMappingStore;

  private pollingService: PollingService;

  public static create(args: EventMappingServiceArgs) {
    return new this(args);
  }

  protected constructor({ mappingStore, fetchMappings }: EventMappingServiceArgs) {
    this.fetchMappings = fetchMappings;
    this.mappingStore = mappingStore;

    this.pollingService = PollingService.create({
      task: this.updateMappings.bind(this),
      intervalMs: 0,
      taskName: 'event mappings',
      errorHandler: (error) => Logger.error("Update event mapping store error", error)
    });
  }

  async startPolling(intervalMs: number): Promise<void> {
    this.pollingService.setInterval(intervalMs);
    await this.pollingService.startPolling();
  }

  async stopPolling() {
    this.pollingService.stopPolling();
  }

  private async updateMappings(): Promise<void> {
    try {
      const mappingsData = await this.fetchMappings();
      this.updateMappingStore(mappingsData.mappings);
    } catch (error) {
      Logger.error("Update event mapping store error", error);
    }
  }

  private updateMappingStore(mappings?: string) {
    if (!mappings) {
      Logger.debug('No mappings exist. Skipping event updates...');
      return
    }

    const sportsEventPropertyById = mappings.split(";");

    for (const property of sportsEventPropertyById) {
      const [id, value] = property.split(":");
      this.mappingStore.set(id, value);
    }
  }

  public transformEvents(sportsEvents: Record<string, PersistedSportEvent>) {
    let events = {};

    for (const [id, event] of Object.entries(sportsEvents)) {
      try {
        const transformedEvent = this.transformEvent(event);
        if (transformedEvent) {
          events[id] = transformedEvent;
        }
      } catch (error) {
        Logger.error(`Transformation error {eventId=${event.id}}. Skipping processing event...`, error);
      }
    }

    return events;
  }

  // map existing ids to their human-readable mappings
  public transformEvent(sportsEvent: PersistedSportEvent): SportEvent | null {
    const {
      id,
      sportId,
      competitionId,
      startTime,
      homeCompetitorId,
      awayCompetitorId,
      statusId,
      scores
    } = sportsEvent;

    try {
      const sportName = this.getMappedName(sportId);
      const competitionName = this.getMappedName(competitionId);
      const statusName = this.getMappedName(statusId);
      const competitors = this.getMappedCompetitors(homeCompetitorId, awayCompetitorId)
      const scoreNames = this.getMappedScores(scores);

      return {
        id,
        status: statusName,
        scores: scoreNames,
        startTime,
        sport: sportName,
        competitors,
        competition: competitionName,
      };
    } catch (error) {
      Logger.error(`Mapping error {eventId=${id}}. Skipping processing event...`, error);
      return null
    }
  }

  public verifyEventMappings(
    event: {
      id: string,
      sportId: string;
      competitionId: string;
      statusId: string;
      homeCompetitorId: string;
      awayCompetitorId: string;
      scores: string;
    }
  ) {
    const requiredMappings = [
      { id: event.sportId, name: 'sportId' },
      { id: event.competitionId, name: 'competitionId' },
      { id: event.statusId, name: 'statusId' },
      { id: event.homeCompetitorId, name: 'homeCompetitorId' },
      { id: event.awayCompetitorId, name: 'awayCompetitorId' },
    ];

    for (const { id, name } of requiredMappings) {
      if (!this.mappingStore.get(id)) {
        throw new Error(`Validation error: missing mapping for {name=${name}; id=${id}}`);
      }
    }

    if (event.scores === "N/A") {
      return
    }

    if (!event.scores) {
      throw new Error(`Validation error: missing scores for {eventId=${event.id}}`);
    }

    const periods = event.scores.split('|');

    for (const period of periods) {
      const [periodType] = period.split('@');
      if (!this.mappingStore.get(periodType)) {
        throw new Error(`Validation error: missing mapping for score periodType={${periodType}}`);
      }
    }
  }

  public getMappedCompetitors(homeCompetitorId: string, awayCompetitorId: string, timestamp?: string) {
    const homeCompetitorName = this.getMappedName(homeCompetitorId, timestamp);
    const awayCompetitorName = this.getMappedName(awayCompetitorId, timestamp);

    return {
      "HOME": {
        type: "HOME",
        name: homeCompetitorName,
      },
      "AWAY": {
        type: "AWAY",
        name: awayCompetitorName,
      }
    }
  }

  public getMappedScores(scores: string, timestamp?: string) {
    if (!scores || scores === "N/A") {
      return "N/A"
    }

    const scorePeriods: SportEventScores = {}
    const periods = scores.split('|');

    periods.forEach(period => {
      const [periodType, score] = period.split('@');
      const [homeScore, awayScore] = score.split(':');

      const mappedPeriodType = this.getMappedName(periodType, timestamp)

      scorePeriods[mappedPeriodType] = {
        type: mappedPeriodType,
        home: homeScore,
        away: awayScore,
      };
    });

    return scorePeriods;
  }

  public getMappedName(id: string, timestamp?: string) {
    const mapping = this.mappingStore.get(id, timestamp);

    if (!mapping) {
      throw new Error(`Validation error: Missing mapping for {id=${id}${timestamp ? `timestamp=${timestamp}` : ""}`);
    }

    return mapping;
  }

  public getIdByValue(value: string) {
    return this.mappingStore.getIdByValue(value)
  }
}
