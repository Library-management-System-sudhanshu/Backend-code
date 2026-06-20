import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';

const router = Router();
const controller = new WorkspaceController();

// Apply auth middleware to all routes in this router
router.use(authenticateJWT);

// Workspaces CRUD
router.get('/', requireRoles('SUPER_ADMIN'), (req, res, next) => controller.getAllWorkspaces(req, res, next));
router.get('/:id', requireRoles('SUPER_ADMIN', 'WORKSPACE_OWNER', 'MANAGER'), (req, res, next) => controller.getWorkspaceById(req, res, next));
router.patch('/:id', requireRoles('SUPER_ADMIN', 'WORKSPACE_OWNER'), (req, res, next) => controller.updateWorkspace(req, res, next));

// Branches
router.get('/:workspaceId/branches', requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF'), (req, res, next) => controller.getBranches(req, res, next));
router.post('/:workspaceId/branches', requireRoles('WORKSPACE_OWNER', 'MANAGER'), (req, res, next) => controller.createBranch(req, res, next));
router.patch('/branches/:id', requireRoles('WORKSPACE_OWNER', 'MANAGER'), (req, res, next) => controller.updateBranch(req, res, next));

// Shifts
router.get('/:workspaceId/shifts', requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF', 'STUDENT'), (req, res, next) => controller.getShifts(req, res, next));
router.post('/:workspaceId/shifts', requireRoles('WORKSPACE_OWNER', 'MANAGER'), (req, res, next) => controller.createShift(req, res, next));
router.patch('/shifts/:id', requireRoles('WORKSPACE_OWNER', 'MANAGER'), (req, res, next) => controller.updateShift(req, res, next));
router.delete('/shifts/:id', requireRoles('WORKSPACE_OWNER', 'MANAGER'), (req, res, next) => controller.deleteShift(req, res, next));

// Subscription Plans
router.get('/:workspaceId/plans', requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF', 'STUDENT'), (req, res, next) => controller.getPlans(req, res, next));
router.post('/:workspaceId/plans', requireRoles('WORKSPACE_OWNER', 'MANAGER'), (req, res, next) => controller.createPlan(req, res, next));
router.patch('/plans/:id', requireRoles('WORKSPACE_OWNER', 'MANAGER'), (req, res, next) => controller.updatePlan(req, res, next));

// Workspace Settings
router.get('/:workspaceId/settings', requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF'), (req, res, next) => controller.getSettings(req, res, next));
router.patch('/:workspaceId/settings', requireRoles('WORKSPACE_OWNER'), (req, res, next) => controller.updateSettings(req, res, next));

export default router;
