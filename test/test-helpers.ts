export const BASKETBALL_EVENT_ID = '995e0722-4118-4f8e-a517-82f6ea240673';
export const FOOTBALL_EVENT_ID = 'da44bd9f-a1b0-4f36-b50f-4cc2acf75b21';

export const MALFORMED_EVENT_0_ID = "a5a5c86d-e7df-4e9e-a59d-5e36d80e037e"
export const MALFORMED_EVENT_1_ID = "372b1938-2885-40b2-8780-eeea255638fd"

const BASKETBALL_ID = "c0a1f678-dbe5-4cc8-aa52-8c822dc65267"
const FOOTBALL_ID = "5884315c-6733-4320-b84b-2b4d5088f0be"

export const LIVE_STATUS_ID = "ac68a563-e511-4776-b2ee-cd395c7dc424"

export const FOOTBALL_SPORT_EVENT = {
  "odds": `${FOOTBALL_EVENT_ID},${FOOTBALL_ID},7ee17545-acd2-4332-869b-1bef06cfaec8,1709900432183,29190088-763e-4d1c-861a-d16dbfcf858c,3cd8eeee-a57c-48a3-845f-93b561a95782,ac68a563-e511-4776-b2ee-cd395c7dc424,e2d12fef-ae82-4a35-b389-51edb8dc664e@0:0|6c036000-6dd9-485d-97a1-e338e6a32a51@0:0\n`
};

export const createSportEvent = ({
  eventId = BASKETBALL_EVENT_ID,
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

export const sportEvent = createSportEvent({});
export const removedSportEvent = createSportEvent({ status: 'REMOVED' });

export const createApiSportEvent = ({ sport = BASKETBALL_ID, status = LIVE_STATUS_ID, scores = 'e2d12fef-ae82-4a35-b389-51edb8dc664e@0:0|6c036000-6dd9-485d-97a1-e338e6a32a51@0:0' }) => ({
  "odds": `${BASKETBALL_EVENT_ID},${sport},7ee17545-acd2-4332-869b-1bef06cfaec8,1709900432183,29190088-763e-4d1c-861a-d16dbfcf858c,3cd8eeee-a57c-48a3-845f-93b561a95782,${status},${scores}\n`
});

export const basketballEvent = createApiSportEvent({});

export const createMappings = ({
  liveStatus = LIVE_STATUS_ID
}) => {
  return { "mappings": `${FOOTBALL_ID}:Football;${BASKETBALL_ID}:Basketball;7ee17545-acd2-4332-869b-1bef06cfaec8:Premier League;29190088-763e-4d1c-861a-d16dbfcf858c:Brooklyn NETS;3cd8eeee-a57c-48a3-845f-93b561a95782:LA Lakers;${liveStatus}:LIVE;cb807d14-5a98-4b41-8ddc-74a1f5f80f9b:REMOVED;5d8040b7-0331-43ac-8051-03913e2c3a5d:PRE;cb807d14-5a98-4b41-8ddc-74a1f5f80f9b:REMOVED;e2d12fef-ae82-4a35-b389-51edb8dc664e:CURRENT;6c036000-6dd9-485d-97a1-e338e6a32a51:PERIOD_1;2db8bc38-b46d-4bd9-9218-6f8dbe083517:PERIOD_2;0cfb491c-7d09-4ffc-99fb-a6ee0cf5d198:PERIOD_3;5a79d3e7-85b3-4d6b-b4bf-ddd743e7162f:PERIOD_4` }
}

export const sportEventPropertiesById = createMappings({});

export const MALFORMED_EVENT_0 = `${MALFORMED_EVENT_0_ID},7ee17545-acd2-4332-869b-1bef06cfaec8,1709900432183,29190088-763e-4d1c-861a-d16dbfcf858c,3cd8eeee-a57c-48a3-845f-93b561a95782,ac68a563-e511-4776-b2ee-cd395c7dc424,e2d12fef-ae82-4a35-b389-51edb8dc664e@0:0|6c036000-6dd9-485d-97a1-e338e6a32a51@0:0`;
export const MALFORMED_EVENT_1 = `${MALFORMED_EVENT_1_ID},qwerty`;
