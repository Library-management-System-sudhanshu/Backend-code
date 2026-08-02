import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import { tenantIsolation } from '../middlewares/tenant.middleware';

const router = Router();
const controller = new WorkspaceController();

// Apply auth & tenant isolation middleware to all routes in this router
router.use(authenticateJWT);
router.use(tenantIsolation);

// Workspaces CRUD
// Workspaces CRUD
router.get('/', requireRoles('SUPER_ADMIN'), (req, res, next) => controller.getAllWorkspaces(req, res, next));
router.post('/', requireRoles('SUPER_ADMIN'), (req, res, next) => controller.createWorkspace(req, res, next));
router.get('/:id', requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER'), (req, res, next) => controller.getWorkspaceById(req, res, next));
router.patch('/:id', requireRoles('SUPER_ADMIN', 'OWNER'), (req, res, next) => controller.updateWorkspace(req, res, next));

// SaaS Subscription Management
router.get('/:id/saas-subscription', requireRoles('SUPER_ADMIN', 'OWNER'), (req, res, next) => controller.getSaaSSubscription(req, res, next));
router.post('/:id/start-trial', requireRoles('SUPER_ADMIN', 'OWNER'), (req, res, next) => controller.startSaaSTrial(req, res, next));
router.post('/:id/saas-payment/create', requireRoles('SUPER_ADMIN', 'OWNER'), (req, res, next) => controller.createSaaSPayment(req, res, next));
router.post('/:id/saas-payment/verify', requireRoles('SUPER_ADMIN', 'OWNER'), (req, res, next) => controller.verifySaaSPayment(req, res, next));

// Branches
router.get('/:workspaceId/branches', requireRoles('OWNER', 'MANAGER', 'STAFF'), (req, res, next) => controller.getBranches(req, res, next));
router.post('/:workspaceId/branches', requireRoles('OWNER', 'MANAGER'), (req, res, next) => controller.createBranch(req, res, next));
router.patch('/branches/:id', requireRoles('OWNER', 'MANAGER'), (req, res, next) => controller.updateBranch(req, res, next));

// Shifts
router.get('/:workspaceId/shifts', requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'), (req, res, next) => controller.getShifts(req, res, next));
router.post('/:workspaceId/shifts', requireRoles('OWNER', 'MANAGER'), (req, res, next) => controller.createShift(req, res, next));
router.patch('/shifts/:id', requireRoles('OWNER', 'MANAGER'), (req, res, next) => controller.updateShift(req, res, next));
router.delete('/shifts/:id', requireRoles('OWNER', 'MANAGER'), (req, res, next) => controller.deleteShift(req, res, next));

// Subscription Plans
router.get('/:workspaceId/plans', requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'), (req, res, next) => controller.getPlans(req, res, next));
router.post('/:workspaceId/plans', requireRoles('OWNER', 'MANAGER'), (req, res, next) => controller.createPlan(req, res, next));
router.patch('/plans/:id', requireRoles('OWNER', 'MANAGER'), (req, res, next) => controller.updatePlan(req, res, next));

// Workspace Settings
router.get('/:workspaceId/settings', requireRoles('OWNER', 'MANAGER', 'STAFF'), (req, res, next) => controller.getSettings(req, res, next));
router.patch('/:workspaceId/settings', requireRoles('OWNER'), (req, res, next) => controller.updateSettings(req, res, next));

export default router;
