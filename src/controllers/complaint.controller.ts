import { Request, Response, NextFunction } from 'express';
import { ComplaintService } from '../services/complaint.service';

const complaintService = new ComplaintService();

export class ComplaintController {
  async createComplaint(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await complaintService.createComplaint(req.body.studentProfileId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getWorkspaceComplaints(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.query.workspaceId as string;
      const result = await complaintService.getWorkspaceComplaints(workspaceId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateComplaintStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await complaintService.updateComplaintStatus(
        (req.params.id as string),
        req.body.resolvedById,
        req.body.status
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getStudentComplaints(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await complaintService.getStudentComplaints((req.params.studentProfileId as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
