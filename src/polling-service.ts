
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
    try {
      await this.executeTask();
      this.pollingInterval = setInterval(async () => {
        await this.executeTask();
      }, this.intervalMs);
    } catch (error) {
      throw error;
    }
  }

  stopPolling(): void {

  }

  private async executeTask(): Promise<void> {
    await this.task()
  }
}

