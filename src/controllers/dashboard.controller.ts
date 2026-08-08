import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';

const dashboardService = new DashboardService();

export class DashboardController {
  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req.query.workspaceId as string) || (req as any).user?.workspaceId;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
      const result = await dashboardService.getMetrics(workspaceId, days);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getSuperAdminMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await dashboardService.getSuperAdminMetrics();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
