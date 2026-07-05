import { Request, Response, NextFunction } from 'express';
import { SeatService } from '../services/seat.service';
import { StudentProfile, SeatAllocation } from '../models';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const seatService = new SeatService();

export class SeatController {
  async getSeatMap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await seatService.getSeatMap((req.params.branchId as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async addFloor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await seatService.addFloor(req.body.branchId, req.body.name);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async addRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await seatService.addRoom(req.body.floorId, req.body.name);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async addSeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await seatService.addSeat(req.body.roomId, req.body.number);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await seatService.deleteRoom((req.params.id as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteFloor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await seatService.deleteFloor((req.params.id as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateFloor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await seatService.updateFloor((req.params.id as string), req.body.name);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await seatService.updateRoom((req.params.id as string), req.body.name);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteSeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await seatService.deleteSeat((req.params.id as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateSeatStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await seatService.updateSeatStatus((req.params.id as string), req.body.status);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async allocateSeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      console.log("allocateSeat controller request body:", req.body);
      if (authReq.user?.role === 'STUDENT') {
        const profile = await StudentProfile.findOne({ where: { userId: authReq.user.id } });
        if (!profile) {
          res.status(404).json({ message: 'Student profile not found' });
          return;
        }
        req.body.studentProfileId = profile.id;
      }
      const result = await seatService.allocateSeat(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error("allocateSeat controller error caught:", error);
      next(error);
    }
  }

  async transferSeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      if (authReq.user?.role === 'STUDENT') {
        const profile = await StudentProfile.findOne({ where: { userId: authReq.user.id } });
        if (!profile) {
          res.status(404).json({ message: 'Student profile not found' });
          return;
        }
        const allocation = await SeatAllocation.findByPk(req.body.allocationId);
        if (!allocation || allocation.studentProfileId !== profile.id || !allocation.isActive) {
          res.status(403).json({ message: 'Forbidden: You can only transfer your own active seat' });
          return;
        }
      }
      const result = await seatService.transferSeat(req.body.allocationId, req.body.targetSeatId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async vacateSeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      if (authReq.user?.role === 'STUDENT') {
        const profile = await StudentProfile.findOne({ where: { userId: authReq.user.id } });
        if (!profile) {
          res.status(404).json({ message: 'Student profile not found' });
          return;
        }
        const allocation = await SeatAllocation.findOne({
          where: { seatId: req.params.id, studentProfileId: profile.id, isActive: true }
        });
        if (!allocation) {
          res.status(403).json({ message: 'Forbidden: You can only vacate your own active seat' });
          return;
        }
      }
      const result = await seatService.vacateSeat((req.params.id as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async checkExpirations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await seatService.checkExpirations();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateLayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId, layout, canvasWidth, canvasHeight, spacers } = req.body;
      const result = await seatService.updateLayout(roomId, layout, canvasWidth, canvasHeight, spacers);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateAllocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await seatService.updateAllocation((req.params.id as string), req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
