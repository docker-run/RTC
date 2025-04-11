import { COMPETITOR_IDS, EVENT_IDS, SCORE_TYPES, SPORT_IDS, START_TIME, STATUS_IDS } from './fixtures';
import { Odds } from "../src/types";

type Score = { type: string; home: string; away: string };
type Competitor = { type: 'HOME' | 'AWAY'; name: string };

interface SportEventParams {
  eventId?: string;
  status?: string;
  scores?: Record<string, Score>;
  sport?: string;
  competitors?: Record<string, Competitor>;
  competition?: string;
}

export class SportEventBuilder {
  private params: Partial<SportEventParams> = {
    eventId: EVENT_IDS.BASKETBALL,
    status: 'LIVE',
    scores: {
      CURRENT: { type: "CURRENT", home: "0", away: "0" },
      PERIOD_1: { type: "PERIOD_1", home: "0", away: "0" }
    },
    sport: 'Basketball',
    competitors: {
      HOME: { type: "HOME", name: "Brooklyn NETS" },
      AWAY: { type: "AWAY", name: "LA Lakers" }
    },
    competition: 'Premier League'
  };

  withEventId(eventId: string): this {
    this.params.eventId = eventId;
    return this;
  }

  withStatus(status: string): this {
    this.params.status = status;
    return this;
  }

  build() {
    return {
      [this.params.eventId!]: {
        id: this.params.eventId,
        status: this.params.status,
        scores: this.params.scores,
        startTime: '1709900432183',
        sport: this.params.sport,
        competitors: this.params.competitors,
        competition: this.params.competition
      }
    };
  }
}

export class MappingsBuilder {
  private liveStatus: string;

  constructor(liveStatus?: string) {
    this.liveStatus = liveStatus || STATUS_IDS.LIVE;
  }

  withLiveStatus(liveStatus: string): this {
    this.liveStatus = liveStatus;
    return this;
  }

  build() {
    return {
      mappings: `${SPORT_IDS.FOOTBALL}:Football;${SPORT_IDS.BASKETBALL}:Basketball;7ee17545:Premier League;29190088:Brooklyn NETS;3cd8eeee:LA Lakers;${this.liveStatus}:LIVE;${STATUS_IDS.REMOVED}:REMOVED;${STATUS_IDS.PRE}:PRE;${SCORE_TYPES.CURRENT}:CURRENT;${SCORE_TYPES.PERIOD_1}:PERIOD_1;${SCORE_TYPES.PERIOD_2}:PERIOD_2;${SCORE_TYPES.PERIOD_3}:PERIOD_3;${SCORE_TYPES.PERIOD_4}:PERIOD_4`
    };
  }
}

export function isNotNil<TType>(arg: TType | undefined | null): arg is TType {
  if (arg == null) {
    return false;
  }
  return true;
}

export class Odd {
  id: string;
  sportId: string;
  competitionId?: string | null;
  startTime?: string;
  homeCompetitorId?: string;
  awayCompetitorId?: string;
  statusId?: string;
  scores?: string | null;

  stringRepresentation: string;

  constructor(allParameters: {
    id?: string;
    sportId?: string;
    competitionId?: string | null;
    startTime?: string;
    homeCompetitorId?: string;
    awayCompetitorId?: string;
    statusId?: string;
    scores?: string | null;
  }) {
    this.id = allParameters.id || EVENT_IDS.BASKETBALL;
    this.sportId = allParameters.sportId || SPORT_IDS.BASKETBALL;
    this.competitionId = allParameters.competitionId === null ? allParameters.competitionId : (allParameters.competitionId || "7ee17545");
    this.startTime = allParameters.startTime || START_TIME;
    this.homeCompetitorId = allParameters.homeCompetitorId || COMPETITOR_IDS.HOME_COMPETITOR_ID;
    this.awayCompetitorId = allParameters.awayCompetitorId || COMPETITOR_IDS.AWAY_COMPETITOR_ID;
    this.statusId = allParameters.statusId || STATUS_IDS.LIVE;
    this.scores = allParameters.scores === null ? allParameters.scores : allParameters.scores || `${SCORE_TYPES.CURRENT}@0:0|${SCORE_TYPES.PERIOD_1}@0:0`;

    this.stringRepresentation = this.toString();
  }

  public toString(): string {
    return [
      this.id,
      this.sportId,
      this.competitionId,
      this.startTime,
      this.homeCompetitorId,
      this.awayCompetitorId,
      this.statusId,
      this.scores
    ].filter(isNotNil).join(',');
  }
}

export class OddsBuilder {
  private odds: string[] = [];

  withOdd(odd: string): this {
    this.odds.push(odd);
    return this;
  }

  build(): Odds {
    return {
      odds: this.odds.join('\n')
    };
  }
}
