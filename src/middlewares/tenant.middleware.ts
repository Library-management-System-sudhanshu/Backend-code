import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { Branch } from '../models/branch.model';

export const tenantIsolation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = req.user;

  if (user && user.role !== 'SUPER_ADMIN') {
    // 1. Path parameter validation: workspaceId
    if (req.params.workspaceId && req.params.workspaceId !== user.workspaceId) {
      res.status(403).json({ message: 'Forbidden: Access denied to this workspace' });
      return;
    }

    // 2. Path parameter validation: branchId
    if (req.params.branchId) {
      try {
        const branch = await Branch.findByPk(req.params.branchId as string);
        if (!branch || branch.workspaceId !== user.workspaceId) {
          res.status(403).json({ message: 'Forbidden: Access denied to this branch' });
          return;
        }
      } catch (error) {
        res.status(500).json({ message: 'Internal server error validating branch access' });
        return;
      }
    }

    // 3. Query & Body injection
    if (req.method === 'GET') {
      const query = { ...req.query, workspaceId: user.workspaceId };
      Object.defineProperty(req, 'query', {
        value: query,
        writable: true,
        configurable: true,
      });
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
