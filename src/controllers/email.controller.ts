import { Request, Response, NextFunction } from 'express';
import { EmailService } from '../services/email.service';

const emailService = new EmailService();

export class EmailController {
  async sendBroadcast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req.body.workspaceId || req.query.workspaceId) as string;
      const result = await emailService.sendBroadcast(workspaceId, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.query.workspaceId as string;
      const result = await emailService.getLogs(workspaceId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req.query.workspaceId as string) || (req as any).user?.workspaceId;
      const result = await emailService.getStats(workspaceId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getDomainInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const domainName = (req.query.name as string) || 'trishulindustries.online';
      const result = await emailService.getDomainInfo(domainName);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async verifyDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.body;
      const result = await emailService.verifyDomain(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, openTracking, clickTracking } = req.body;
      const result = await emailService.updateDomain(id, openTracking, clickTracking);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
