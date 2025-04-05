import { Request, Response } from 'express';

export class Logger {
  static info(message: string, data?: any): void {
    console.log(`[INFO] ${message}`, data || '');
  }

  static error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error || '');
  }

  static warn(message: string, error?: any): void {
    console.warn(`[WARNING] ${message}`, error || '');
  }

  static debug(message: string, error?: any): void {
    console.debug(`[DEBUG] ${message}`, error || '');
  }

  static apiRequest(req: Request, res: Response, startTime: bigint): void {
    const duration = Number(process.hrtime.bigint() - startTime) / 1e6;

    Logger.info(`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
    });
  }
}
