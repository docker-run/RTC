export interface Odds {
  odds?: string
}

export type FetchEventsFn = () => Promise<{ odds?: string }>;
export type FetchMappingsFn = () => Promise<{ mappings?: string }>;

export interface AppConfig {
  pollingIntervalMs: number;
  mappingsApi: string;
  sportEventsApi: string;
}

export type SportEventScores = Record<string, { type: string, home: string, away: string }>
export type SportEventCompetitors = Record<string, { type: string, name: string }>

export interface SportEvent {
  id: string;
  status: string;
  competitors: SportEventCompetitors;
  competition: string;
  scores: SportEventScores | "N/A";
  startTime: string;
  sport: string;
}

export interface PersistedSportEvent {
  id: string;
  sportId: string;
  competitionId: string;
  startTime: string;
  homeCompetitorId: string;
  awayCompetitorId: string;
  statusId: string;
  scores: string;
  timestamp?: string;
}
