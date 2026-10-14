import { WorkspaceAdminService } from '../services/workspace-admin.service';
import { WorkspaceAccessGrant } from '../models/workspace-access-grant.model';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import {
  tenantIsolation,
  resourceAccess,
} from '../middlewares/tenant.middleware';

const router = Router();
const controller = new WorkspaceController();

// Apply auth & tenant isolation middleware to all routes in this router
router.use(authenticateJWT);

// Workspaces CRUD
// Workspaces CRUD
router.get(
  '/',
  requireRoles('SUPER_ADMIN'),
  tenantIsolation,
  (req, res, next) => controller.getAllWorkspaces(req, res, next),
);
router.post(
  '/',
  requireRoles('SUPER_ADMIN'),
  tenantIsolation,
  (req, res, next) => controller.createWorkspace(req, res, next),
);
router.get(
  '/:id',
  requireRoles('SUPER_ADMIN', 'OWNER'),
  tenantIsolation,
  resourceAccess('workspace', 'id'),
  (req, res, next) => controller.getWorkspaceById(req, res, next),
);
router.patch(
  '/:id',
  requireRoles('SUPER_ADMIN', 'OWNER'),
  tenantIsolation,
  resourceAccess('workspace', 'id'),
  (req, res, next) => controller.updateWorkspace(req, res, next),
);
router.delete(
  '/:id',
  requireRoles('SUPER_ADMIN'),
  tenantIsolation,
  resourceAccess('workspace', 'id'),
  (req, res, next) => controller.deleteWorkspace(req, res, next),
);
router.delete(
  '/users/:userId',
  requireRoles('SUPER_ADMIN'),
  (req, res, next) => controller.deleteUser(req, res, next),
);

// SaaS Subscription Management
router.get(
  '/:id/saas-subscription',
  requireRoles('SUPER_ADMIN', 'OWNER'),
  tenantIsolation,
  resourceAccess('workspace', 'id'),
  (req, res, next) => controller.getSaaSSubscription(req, res, next),
);
router.post(
  '/:id/start-trial',
  requireRoles('SUPER_ADMIN', 'OWNER'),
  tenantIsolation,
  resourceAccess('workspace', 'id'),
  (req, res, next) => controller.startSaaSTrial(req, res, next),
);
router.post(
  '/:id/saas-payment/create',
  requireRoles('SUPER_ADMIN', 'OWNER'),
  tenantIsolation,
  resourceAccess('workspace', 'id'),
  (req, res, next) => controller.createSaaSPayment(req, res, next),
);
router.post(
  '/:id/saas-payment/verify',
  requireRoles('SUPER_ADMIN', 'OWNER'),
  tenantIsolation,
  resourceAccess('workspace', 'id'),
  (req, res, next) => controller.verifySaaSPayment(req, res, next),
);

// Branches
router.get(
  '/:workspaceId/branches',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.getBranches(req, res, next),
);
router.post(
  '/:workspaceId/branches',
  requireRoles('OWNER'),
  tenantIsolation,
  (req, res, next) => controller.createBranch(req, res, next),
);
router.patch(
  '/branches/:id',
  requireRoles('OWNER', 'MANAGER'),
  tenantIsolation,
  resourceAccess('branch', 'id'),
  (req, res, next) => controller.updateBranch(req, res, next),
);

// Shifts
router.get(
  '/:workspaceId/shifts',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  tenantIsolation,
  (req, res, next) => controller.getShifts(req, res, next),
);
router.post(
  '/:workspaceId/shifts',
  requireRoles('OWNER'),
  tenantIsolation,
  (req, res, next) => controller.createShift(req, res, next),
);
router.patch(
  '/shifts/:id',
  requireRoles('OWNER'),
  tenantIsolation,
  resourceAccess('shift', 'id'),
  (req, res, next) => controller.updateShift(req, res, next),
);
router.delete(
  '/shifts/:id',
  requireRoles('OWNER'),
  tenantIsolation,
  resourceAccess('shift', 'id'),
  (req, res, next) => controller.deleteShift(req, res, next),
);

// Subscription Plans
router.get(
  '/:workspaceId/plans',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  tenantIsolation,
  (req, res, next) => controller.getPlans(req, res, next),
);
router.post(
  '/:workspaceId/plans',
  requireRoles('OWNER'),
  tenantIsolation,
  (req, res, next) => controller.createPlan(req, res, next),
);
router.patch(
  '/plans/:id',
  requireRoles('OWNER'),
  tenantIsolation,
  resourceAccess('plan', 'id'),
  (req, res, next) => controller.updatePlan(req, res, next),
);

// Workspace Settings
router.get(
  '/:workspaceId/settings',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.getSettings(req, res, next),
);
router.patch(
  '/:workspaceId/settings',
  requireRoles('OWNER'),
  tenantIsolation,
  (req, res, next) => controller.updateSettings(req, res, next),
);

const admin = new WorkspaceAdminService();
router.get(
  '/:workspaceId/memberships',
  requireRoles('OWNER', 'SUPER_ADMIN'),
  tenantIsolation,
  resourceAccess('workspace', 'workspaceId'),
  async (req, res, next) => {
    try {
      res.json(await admin.listMembers(req.params.workspaceId as string));
    } catch (error) {
      next(error);
    }
  },
);
router.post(
  '/:workspaceId/memberships',
  requireRoles('OWNER', 'SUPER_ADMIN'),
  tenantIsolation,
  resourceAccess('workspace', 'workspaceId'),
  async (req, res, next) => {
    try {
      res.json(
        await admin.assignStaff(req.params.workspaceId as string, req.body),
      );
    } catch (error) {
      next(error);
    }
  },
);
router.get(
  '/:id/grace',
  requireRoles('SUPER_ADMIN'),
  resourceAccess('workspace'),
  async (req, res, next) => {
    try {
      res.json(
        await WorkspaceAccessGrant.findAll({
          where: { workspaceId: req.params.id },
          order: [['createdAt', 'DESC']],
        }),
      );
    } catch (error) {
      next(error);
    }
  },
);
router.post(
  '/:id/grace',
  requireRoles('SUPER_ADMIN'),
  resourceAccess('workspace'),
  async (req, res, next) => {
    try {
      res
        .status(201)
        .json(
          await admin.grantGrace(
            req.params.id as string,
            (req as AuthenticatedRequest).user!.id,
            req.body,
          ),
        );
    } catch (error) {
      next(error);
    }
  },
);
router.delete(
  '/:id/grace',
  requireRoles('SUPER_ADMIN'),
  resourceAccess('workspace'),
  async (req, res, next) => {
    try {
      res.json(
        await admin.revokeGrace(
          req.params.id as string,
          (req as AuthenticatedRequest).user!.id,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);
export default router;
