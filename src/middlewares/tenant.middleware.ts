import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export const tenantIsolation = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user;

  if (user && user.role !== 'SUPER_ADMIN') {
    if (req.method === 'GET') {
      req.query.workspaceId = user.workspaceId;
    } else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (!req.body) {
        req.body = { workspaceId: user.workspaceId };
      } else {
        req.body.workspaceId = user.workspaceId;
      }
    }
  }
  next();
};
