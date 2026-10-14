import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';

import { resolveMembership } from '../services/membership.service';
import { getJwtSecret } from '../config/auth';

export interface AuthenticatedRequest extends Request {
  user?: User;
  membershipId?: string;
  assignedBranchIds?: string[];
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    }) as any;

    if (!decoded || !decoded.sub || decoded.tokenUse !== 'access') {
      res.status(401).json({ message: 'Unauthorized: Invalid token payload' });
      return;
    }

    const user = await User.findByPk(decoded.sub);
    if (!user) {
      res
        .status(401)
        .json({ message: 'Unauthorized: User not found or session invalid' });
      return;
    }

    const accountRoute =
      req.baseUrl.endsWith('/auth') &&
      ['/memberships', '/select-workspace', '/setup-workspace'].includes(
        req.path,
      );
    const selected = accountRoute
      ? undefined
      : req.get('X-Workspace-Id') || decoded.workspaceId || undefined;
    const branch = req.get('X-Branch-Id') || undefined;
    const context = accountRoute
      ? { user, membership: null, branchIds: [] as string[] }
      : await resolveMembership(user, selected, branch);
    req.user = context.user;
    req.membershipId = context.membership?.id;
    req.assignedBranchIds = context.branchIds;
    next();
  } catch (error: any) {
    if (error.status) {
      next(error);
      return;
    }
    if (error.name === 'TokenExpiredError') {
      res
        .status(401)
        .json({ message: 'Token has expired', error: error.message });
      return;
    }
    res.status(401).json({
      message: 'Unauthorized: Invalid or expired token',
      error: (error as Error).message,
    });
  }
};

export const requireRoles = (...roles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized: User not authenticated' });
      return;
    }

    const hasRole = roles.includes(req.user.role);
    if (!hasRole) {
      res.status(403).json({ message: 'Forbidden: Access denied' });
      return;
    }

    next();
  };
};
