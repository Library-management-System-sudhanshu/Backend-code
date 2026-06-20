import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async otpRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.requestOtp(req.body.mobile);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async otpVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyOtp(req.body.mobile, req.body.otp);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
