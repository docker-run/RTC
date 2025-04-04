import { FetchEventsFn } from "./types";

type SportsEventsServiceArgs = {
  fetchEvents: FetchEventsFn;
  eventMappingService: {};
  eventStore: {};
  historicalEventStore: {};
}
