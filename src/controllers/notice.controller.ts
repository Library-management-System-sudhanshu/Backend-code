import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { NoticeService } from '../services/notice.service';

const noticeService = new NoticeService();

export class NoticeController {
  async createNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = (authReq.user?.workspaceId || req.body.workspaceId) as string;
      const createdById = authReq.user?.id;

      if (!workspaceId || !createdById) {
        res.status(400).json({ message: 'Missing workspaceId or user session context' });
        return;
      }

      const result = await noticeService.createNotice(workspaceId, createdById, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getNotices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = (authReq.user?.workspaceId || req.query.workspaceId) as string;

      if (!workspaceId) {
        res.status(400).json({ message: 'Missing workspaceId' });
        return;
      }

      const result = await noticeService.getWorkspaceNotices(workspaceId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteNotice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = (authReq.user?.workspaceId || req.body.workspaceId) as string;
      const noticeId = req.params.id as string;

      if (!workspaceId || !noticeId) {
        res.status(400).json({ message: 'Missing notice ID or workspace context' });
        return;
      }

      const result = await noticeService.deleteNotice(noticeId, workspaceId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
