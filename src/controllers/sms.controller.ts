import { Request, Response, NextFunction } from 'express';
import { SmsService } from '../services/sms.service';

const smsService = new SmsService();

export class SmsController {
  async sendBroadcast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req.body.workspaceId || req.query.workspaceId) as string;
      const result = await smsService.sendBroadcast(workspaceId, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.query.workspaceId as string;
      const result = await smsService.getLogs(workspaceId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
