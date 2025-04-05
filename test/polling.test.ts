import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PollingService } from "../src/polling-service";
import { Logger } from "../src/logger";

describe('PollingService', () => {
  const mockTask = vi.fn();
  const mockErrorHandler = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Logger, 'info');
    vi.spyOn(Logger, 'error');
    mockTask.mockReset();
    mockErrorHandler.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start polling and execute task immediately', async () => {
    const service = PollingService.create({
      task: mockTask,
      intervalMs: 1000,
      taskName: 'test polling'
    });

    await service.startPolling();
    expect(mockTask).toHaveBeenCalledTimes(1);
  });

  it('should execute task at regular intervals', async () => {
    const service = PollingService.create({
      task: mockTask,
      intervalMs: 1000,
      taskName: 'test polling'
    });

    await service.startPolling();
    vi.advanceTimersByTime(3000);
    expect(mockTask).toHaveBeenCalledTimes(4);
  });

  it('should handle task errors with custom handler', async () => {
    const error = new Error('Task failed');
    mockTask.mockRejectedValue(error);

    const service = PollingService.create({
      task: mockTask,
      intervalMs: 1000,
      taskName: 'test polling',
      errorHandler: mockErrorHandler
    });

    await service.startPolling();
    expect(mockErrorHandler).toHaveBeenCalledWith(error);
  });

  it('should stop polling when requested', async () => {
    const service = PollingService.create({
      task: mockTask,
      intervalMs: 1000,
      taskName: 'test polling'
    });

    await service.startPolling();
    service.stopPolling();
    vi.advanceTimersByTime(3000);
    expect(mockTask).toHaveBeenCalledTimes(1);
  });

  it('should not start multiple polling instances', async () => {
    const service = PollingService.create({
      task: mockTask,
      intervalMs: 1000,
      taskName: 'test polling'
    });

    await service.startPolling();
    // following call should be ignored
    await service.startPolling();
    expect(Logger.info).toHaveBeenCalledWith('Polling for test polling already started');
  });
});
