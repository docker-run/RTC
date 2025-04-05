import { Logger } from "./logger";
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
      errorHandler: (error) => Logger.error("Update event mapping store error", error)
    });
  }

  async startPolling(intervalMs: number): Promise<void> {
    (this.pollingService as any).intervalMs = intervalMs;
    await this.pollingService.startPolling();
  }

  async stopPolling() {
    throw new Error('method not implemented yet');
  }

  private async updateMappings(): Promise<void> {
    Logger.debug("Update mappings called")
  }

  public transformEvents(event: any) {
    throw new Error('method not implemented yet');
  }

  // map existing ids to their human-readable mappings
  public transformEvent(event: any) {
    throw new Error('method not implemented yet');
  }

  // skip malformed events before saving
  public verifyEventMappings(event: any) {
    throw new Error('method not implemented yet');
  }

  async getMappedScores(event: any) {
    throw new Error('method not implemented yet');
  }

  async getMappedName(event: any) {
    throw new Error('method not implemented yet');
  }

  public destroyMappingStore() {

  }
}
