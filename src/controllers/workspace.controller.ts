import { Request, Response, NextFunction } from 'express';
import { WorkspaceService } from '../services/workspace.service';

const workspaceService = new WorkspaceService();

export class WorkspaceController {
  // Workspaces CRUD (Super Admin)
  async createWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.createWorkspace(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAllWorkspaces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.getAllWorkspaces();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getWorkspaceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.getWorkspaceById((req.params.id as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.updateWorkspace((req.params.id as string), req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Branches
  async getBranches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.getBranches((req.params.workspaceId as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async createBranch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.createBranch((req.params.workspaceId as string), req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateBranch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.updateBranch((req.params.id as string), req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Shifts
  async getShifts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.getShifts((req.params.workspaceId as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async createShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.createShift((req.params.workspaceId as string), req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.updateShift((req.params.id as string), req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteShift(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.deleteShift((req.params.id as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Subscription Plans
  async getPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.getPlans((req.params.workspaceId as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async createPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.createPlan((req.params.workspaceId as string), req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.updatePlan((req.params.id as string), req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Workspace Settings
  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.getSettings((req.params.workspaceId as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.updateSettings((req.params.workspaceId as string), req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // SaaS Subscriptions
  async getSaaSSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.getSaaSSubscription((req.params.id as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async startSaaSTrial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { days } = req.body;
      const result = await workspaceService.startSaaSTrial((req.params.id as string), days);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async createSaaSPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { saasPlanId } = req.body;
      const result = await workspaceService.createSaaSPayment((req.params.id as string), saasPlanId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async verifySaaSPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await workspaceService.verifySaaSPayment((req.params.id as string), req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
