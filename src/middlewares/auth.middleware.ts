import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';

const JWT_SECRET = process.env.JWT_SECRET || 'studyflow_secret_key_12345';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (!decoded || !decoded.sub) {
      res.status(401).json({ message: 'Unauthorized: Invalid token payload' });
      return;
    }

    const user = await User.findByPk(decoded.sub);
    if (!user) {
      res.status(401).json({ message: 'Unauthorized: User not found or session invalid' });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token has expired', error: error.message });
      return;
    }
    res.status(401).json({ message: 'Unauthorized: Invalid or expired token', error: (error as Error).message });
  }
};

export const requireRoles = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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
