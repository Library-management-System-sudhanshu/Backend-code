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
}
