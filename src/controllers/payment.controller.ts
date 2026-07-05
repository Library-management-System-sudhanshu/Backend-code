import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';

const paymentService = new PaymentService();

export class PaymentController {
  async createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentService.createPayment(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async verifyRazorpay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentService.verifyRazorpay((req.params.id as string), req.body.transactionId, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async recordManualPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentService.recordManualPayment((req.params.id as string), req.body.method);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.query.workspaceId as string;
      const result = await paymentService.getPayments(workspaceId, req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getCollectionReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.query.workspaceId as string;
      const range = (req.query.range as string) || 'monthly';
      const result = await paymentService.getCollectionReport(workspaceId, range);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
