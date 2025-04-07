import { Logger } from "./logger";
import { FetchMappingsFn, PersistedSportEvent, SportEvent, SportEventScores } from "./types";

export type EventMappingServiceArgs = {
  fetchMappings: FetchMappingsFn;
}

export class EventMappingService {
  private mappingsVersion: number = 0;
  private readonly fetchMappings: FetchMappingsFn;
  private mappings: Record<string, string> = {};
  private mappingsCache: Map<number, Record<string, string>> = new Map();

  public static create(args: EventMappingServiceArgs) {
    return new this(args);
  }

  protected constructor({ fetchMappings }: EventMappingServiceArgs) {
    this.fetchMappings = fetchMappings;
  }

  public async updateMappings() {
    try {
      const sportEventPropertiesById = await this.fetchMappings();
      this.updateMappingStore(sportEventPropertiesById.mappings);
    } catch (error) {
      Logger.error("Failed to update mappings cache", error);
    }
  }

  private updateMappingStore(mappings?: string) {
    if (!mappings) {
      Logger.warn('Mappings not defined. Skipping cache update...');
      return
    }

    const parsedMappings = this.parseMappingsString(mappings);

    if (JSON.stringify(parsedMappings) !== JSON.stringify(this.mappings)) {
      this.mappingsVersion++;
      this.mappings = {...parsedMappings};
      this.mappingsCache.set(this.mappingsVersion, {...parsedMappings});
      Logger.debug(`Updated mappings to {version=${this.mappingsVersion}}`);
    } else {
      Logger.debug("Mappings cache is up-to-date. Skipping cache update...");
    }
  }

  private parseMappingsString(mappingsString: string) {
    const mappings = {};
    const entries = mappingsString.split(';');

    for (const entry of entries) {
      const [id, value] = entry.split(':');
      if (id && value) {
        mappings[id.trim()] = value.trim();
      }
    }

    return mappings;
  }

  public transformEvents(sportsEvents: Record<string, PersistedSportEvent>) {
    let events = {};

    for (const [id, event] of Object.entries(sportsEvents)) {
      const transformedEvent = this.transformEvent(event);

      if (transformedEvent) {
        events[id] = transformedEvent;
      }
    }

    return events;
  }

  public transformEvent(sportEvent: PersistedSportEvent): SportEvent | null {
    const {
      id,
      sportId,
      competitionId,
      startTime,
      homeCompetitorId,
      awayCompetitorId,
      statusId,
      scores
    } = sportEvent;

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
      Logger.error(`Failed to transform event {eventId=${id}}. Skipping processing event...`, error);
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
    const mappings = this.getMappingsByVersion(this.mappingsVersion);

    if (!mappings) {
      throw new Error(`Validation error: missing mappings ${this.mappingsVersion}`);
    }

    const requiredMappings = [
      { id: event.sportId, name: 'sportId' },
      { id: event.competitionId, name: 'competitionId' },
      { id: event.statusId, name: 'statusId' },
      { id: event.homeCompetitorId, name: 'homeCompetitorId' },
      { id: event.awayCompetitorId, name: 'awayCompetitorId' },
    ];

    for (const { id, name } of requiredMappings) {
      if (!mappings[id]) {
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
      if (!mappings[periodType]) {
        throw new Error(`Validation error: missing mapping for score periodType={${periodType}}`);
      }
    }
  }

  public getMappedCompetitors(homeCompetitorId: string, awayCompetitorId: string) {
    const homeCompetitorName = this.getMappedName(homeCompetitorId);
    const awayCompetitorName = this.getMappedName(awayCompetitorId);

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

  public getMappedScores(scores: string) {
    if (!scores || scores === "N/A") {
      return "N/A"
    }

    const scorePeriods: SportEventScores = {}
    const periods = scores.split('|');

    periods.forEach(period => {
      const [periodType, score] = period.split('@');
      const [homeScore, awayScore] = score.split(':');

      const mappedPeriodType = this.getMappedName(periodType)

      scorePeriods[mappedPeriodType] = {
        type: mappedPeriodType,
        home: homeScore,
        away: awayScore,
      };
    });

    return scorePeriods;
  }

  public getMappedName(id: string, maxVersionFallbacks: number = 3) {
    if (this.mappings[id]) {
      return this.mappings[id];
    }

    let versionChecked = 0;
    for (let v = this.mappingsVersion - 1;
         v > 0 && versionChecked < maxVersionFallbacks;
         v--, versionChecked++) {
      const versionMappings = this.mappingsCache.get(v);
      if (versionMappings?.[id]) {
        return versionMappings[id];
      }
    }

    throw new Error(`Validation error: Missing mapping for {id=${id}} in current or last ${maxVersionFallbacks} versions`);
  }

  public getIdByValue(value: string): string {
    const foundEntry = Object.entries(this.mappings).find(
        ([, mappedValue]) => mappedValue.toLowerCase() === value.toLowerCase()
    );

    if (!foundEntry) {
      throw new Error(`No ID found for value: ${value}`);
    }

    return foundEntry[0];
  }

  public getMappingsByVersion(version: number) {
    return this.mappingsCache.get(version);
  }

  public getMappingsVersion() {
    return this.mappingsVersion;
  }
}
