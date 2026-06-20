import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendance.service';
import { AttendanceMethod } from '../models/attendance.model';

const attendanceService = new AttendanceService();

export class AttendanceController {
  async checkIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await attendanceService.checkIn(
        req.body.studentProfileId,
        req.body.method || AttendanceMethod.QR_CODE
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async checkOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await attendanceService.checkOut(req.body.studentProfileId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getDailyAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.query.workspaceId as string;
      const date = req.query.date as string;
      const result = await attendanceService.getDailyAttendance(workspaceId, date);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getStudentAttendanceHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await attendanceService.getStudentAttendanceHistory((req.params.studentProfileId as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
