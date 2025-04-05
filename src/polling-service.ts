
type PollingServiceArgs = {
  task(): Promise<void>;
  intervalMs: number;
  taskName: string;
  errorHandler?(error: Error): void;
};

export class PollingService {
  private pollingInterval?: NodeJS.Timeout;
  private isPolling = false;
  private readonly task: () => Promise<void>;
  private readonly intervalMs: number;
  private readonly taskName: string;
  private readonly errorHandler?: (error: Error) => void;

  public static create(args: PollingServiceArgs) {
    return new this(args);
  }

  private constructor({ task, intervalMs, taskName, errorHandler }: PollingServiceArgs) {
    this.task = task;
    this.intervalMs = intervalMs;
    this.taskName = taskName;
    this.errorHandler = errorHandler;
  }

  async startPolling(): Promise<void> {
    if (this.isPolling) {
      console.log("Polling already started")
      return;
    }

    this.isPolling = true;

    console.log(`Starting polling for ${this.taskName}. Interval ${this.intervalMs}ms`)

    try {
      await this.executeTask();
      this.pollingInterval = setInterval(async () => {
        await this.executeTask();
      }, this.intervalMs);
    } catch (error) {
      this.isPolling = false;
      throw error;
    }
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
      console.log(`Polling for ${this.taskName} stopped`);
    }
    this.isPolling = false;
  }

  private async executeTask(): Promise<void> {
    try {
      await this.task();
    } catch (error) {
      console.log(`Error executing ${this.taskName} polling task`, error);
      if (this.errorHandler) {
        this.errorHandler(error as Error);
      }
    }
  }
}

