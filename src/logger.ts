import { Request, Response } from 'express';

export class Logger {
  static info(message: string, data?: any): void {
  }

  static error(message: string, error?: any): void {
  }

  static warn(message: string, error?: any): void {
  }

  static debug(message: string, error?: any): void {
  }

  static apiRequest(req: Request, res: Response, startTime: bigint): void {
  }
}
