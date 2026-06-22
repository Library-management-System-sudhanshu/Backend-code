import { Request, Response, NextFunction } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';

const whatsappService = new WhatsAppService();

export class WhatsAppController {
  async getTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await whatsappService.getTemplates();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async sendBroadcast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req.body.workspaceId || req.query.workspaceId) as string;
      const result = await whatsappService.sendBroadcast(workspaceId, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.query.workspaceId as string;
      const result = await whatsappService.getLogs(workspaceId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
