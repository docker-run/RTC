import { EventMappingService } from "./event-mapping-service";
import { Logger } from "./logger";
import { PollingService } from "./polling-service";
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

  private pollingService: PollingService;

  public static create(args: SportsEventsServiceArgs) {
    return new this(args);
  }

  protected constructor({ fetchEvents, eventStore, eventMappingService, historicalEventStore }: SportsEventsServiceArgs) {
    this.fetchEvents = fetchEvents;
    this.eventStore = eventStore;
    this.eventMappingService = eventMappingService;
    this.historicalEventStore = historicalEventStore;

    this.pollingService = PollingService.create({
      task: this.updateSportsEvents.bind(this),
      intervalMs: 0,
      taskName: 'event mappings',
      errorHandler: (error) => Logger.error("Update sports event store error", error)
    });
  }

  async startPolling(intervalMs: number): Promise<void> {
    (this.pollingService as any).intervalMs = intervalMs;
    await this.pollingService.startPolling();
  }

  private async updateSportsEvents() {
    Logger.info("Events updated")
  }

  public getCurrentEvents() {
    return {}
  }
}
