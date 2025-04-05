import { describe, it, expect, vi } from 'vitest';
import { Logger } from '../src/logger';
import { Request, Response } from 'express';

describe('Logger', () => {
  it('should log info messages', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    Logger.info('Test message');
    expect(consoleSpy).toHaveBeenCalledWith('[INFO] Test message', '');
  });

  it('should log error messages', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    const error = new Error('Test error');
    Logger.error('Test message', error);
    expect(consoleSpy).toHaveBeenCalledWith('[ERROR] Test message', error);
  });

  it('should log API requests', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const mockReq = { method: 'GET', originalUrl: '/test' } as Request;
    const mockRes = { statusCode: 200 } as Response;
    const startTime = BigInt(0);

    Logger.apiRequest(mockReq, mockRes, startTime);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[INFO] GET /test',
      expect.objectContaining({
        status: 200,
        duration: expect.any(String)
      })
    );
  });
});
