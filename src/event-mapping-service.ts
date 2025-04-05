import { PollingService } from "./polling-service";
import { FetchMappingsFn } from "./types";

export type EventMappingServiceArgs = {
  fetchMappings: FetchMappingsFn;
  mappingStore: {};
}

export class EventMappingService {
  private readonly fetchMappings: FetchMappingsFn;
  private readonly mappingStore: {};

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
      errorHandler: (error) => console.error("Update event mapping store error", error)
    });
  }
  private async updateMappings() { }

  async startPolling(intervalMs: number): Promise<void> {
    (this.pollingService as any).intervalMs = intervalMs;
    await this.pollingService.startPolling();
  }
}
