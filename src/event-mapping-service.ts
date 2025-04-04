import { FetchMappingsFn } from "./types";

export type EventMappingServiceArgs = {
  fetchMappings: FetchMappingsFn;
  mappingStore: {};
}

export class EventMappingService {
  private readonly fetchMappings: FetchMappingsFn;
  private readonly mappingStore: {};

  public static create(args: EventMappingServiceArgs) {
    return new this(args);
  }

  protected constructor({ mappingStore, fetchMappings }: EventMappingServiceArgs) {
    this.fetchMappings = fetchMappings;
    this.mappingStore = mappingStore;
  }
}
