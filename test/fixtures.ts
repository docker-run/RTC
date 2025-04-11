import { MappingsBuilder, Odd, OddsBuilder, SportEventBuilder } from "./test-helpers";

export const EVENT_IDS = {
    BASKETBALL: '995e0722',
    FOOTBALL: 'da44bd9f',
    MALFORMED_0: 'a5a5c86d',
    MALFORMED_1: '372b1938'
} as const;

export const SPORT_IDS = {
    BASKETBALL: 'c0a1f678',
    FOOTBALL: '5884315c'
} as const;

export const STATUS_IDS = {
    LIVE: 'ac68a563',
    REMOVED: 'cb807d14',
    PRE: '5d8040b7'
} as const;

export const SCORE_TYPES = {
    CURRENT: 'e2d12fef',
    PERIOD_1: '6c036000',
    PERIOD_2: '2db8bc38',
    PERIOD_3: '0cfb491cj',
    PERIOD_4: '5a79d3e7'
} as const;

export const COMPETITOR_IDS = {
    HOME_COMPETITOR_ID: "29190088",
    AWAY_COMPETITOR_ID: "3cd8eeee",
} as const;

export const START_TIME = "1709900432183";

export const ODDS = {
    BASKETBALL: new Odd({
        id: EVENT_IDS.BASKETBALL,
        sportId: SPORT_IDS.BASKETBALL,
        statusId: STATUS_IDS.LIVE,
        scores: `${SCORE_TYPES.CURRENT}@0:0|${SCORE_TYPES.PERIOD_1}@0:0`
    }).stringRepresentation,
    BASKETBALL_NO_SCORES: new Odd({
        id: EVENT_IDS.BASKETBALL,
        sportId: SPORT_IDS.BASKETBALL,
        statusId: STATUS_IDS.LIVE,
        scores: null
    }).stringRepresentation,
    FOOTBALL: new Odd({
        id: EVENT_IDS.FOOTBALL,
        sportId: SPORT_IDS.FOOTBALL,
        statusId: STATUS_IDS.LIVE,
        scores: `${SCORE_TYPES.CURRENT}@0:0|${SCORE_TYPES.PERIOD_1}@0:0`
    }).stringRepresentation,
    MALFORMED_0:
        new Odd({
            id: EVENT_IDS.MALFORMED_0,
            sportId: "7ee17545",
            startTime: START_TIME,
            competitionId: null,
            homeCompetitorId: "29190088",
            awayCompetitorId: "3cd8eeee",
            statusId: STATUS_IDS.LIVE,
            scores: `${SCORE_TYPES.CURRENT}@0:0|${SCORE_TYPES.PERIOD_1}@0:0`
        }).stringRepresentation,
    MALFORMED_1: new Odd({
        id: EVENT_IDS.MALFORMED_1,
        sportId: "qwerty"
    }).stringRepresentation,
} as const;

export const mappings = new MappingsBuilder().build();
export const basketballOdd = new OddsBuilder().withOdd(ODDS.BASKETBALL).build()
export const footballOdd = new OddsBuilder().withOdd(ODDS.FOOTBALL).build();
export const malformedOdds = new OddsBuilder().withOdd(ODDS.MALFORMED_0).withOdd(ODDS.MALFORMED_1).build();
export const removedEvent = new SportEventBuilder().withStatus('REMOVED').build();
export const basketballEvent = new SportEventBuilder().build();
