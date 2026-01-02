import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  recoverable?: boolean;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const code = err.code || 'INTERNAL_ERROR';
  const recoverable = err.recoverable ?? false;

  res.status(statusCode).json({
    error: message,
    code,
    recoverable,
  });
}

export function createAppError(
  message: string,
  statusCode: number = 500,
  code?: string,
  recoverable: boolean = false
): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.recoverable = recoverable;
  return error;
}
