import { Request, Response, NextFunction } from 'express';

export class HttpException extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string = 'Bad Request') {
    super(400, message);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string = 'Not Found') {
    super(404, message);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errorName = err.name || 'HttpException';

  // Map Sequelize Validation and Constraint errors to 400 Bad Request
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    status = 400;
    message = err.errors ? err.errors.map((e: any) => e.message).join(', ') : err.message;
    errorName = 'ValidationError';
  } else if (err.name === 'SequelizeDatabaseError' && err.parent?.code === '22P02') {
    status = 400;
    message = 'Invalid UUID format or syntax error';
    errorName = 'BadRequestError';
  }

  // Log the error details for debugging
  console.error(`[API Error] ${req.method} ${req.path} - Status: ${status} - Message: ${message}`);
  if (status === 500 || err.name === 'SequelizeDatabaseError') {
    console.error(err);
  }

  res.status(status).json({
    statusCode: status,
    message: message,
    error: errorName,
  });
};
