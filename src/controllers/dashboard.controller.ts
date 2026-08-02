import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';

const dashboardService = new DashboardService();

export class DashboardController {
  async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.query.workspaceId as string;
      const result = await dashboardService.getMetrics(workspaceId);
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
