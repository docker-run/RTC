import { EventMappingService } from "./event-mapping-service";
import { FetchEventsFn } from "./types";

type SportsEventsServiceArgs = {
  fetchEvents: FetchEventsFn;
  eventMappingService: EventMappingService;
  eventStore: {};
  historicalEventStore: {};
}

export class SportsEventsService {
  private readonly historicalEventStore: {};
  private readonly eventStore: {};
  private readonly fetchEvents: FetchEventsFn;
  private readonly eventMappingService: EventMappingService;

  public static create(args: SportsEventsServiceArgs) {
    return new this(args);
  }

  protected constructor({ fetchEvents, eventStore, eventMappingService, historicalEventStore }: SportsEventsServiceArgs) {
    this.fetchEvents = fetchEvents;
    this.eventStore = eventStore;
    this.eventMappingService = eventMappingService;
    this.historicalEventStore = historicalEventStore;
  }

  public getCurrentEvents() {

  }
}
