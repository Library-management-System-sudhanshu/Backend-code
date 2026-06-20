import { Router } from 'express';
import { ComplaintController } from '../controllers/complaint.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import { tenantIsolation } from '../middlewares/tenant.middleware';

const router = Router();
const controller = new ComplaintController();

router.use(authenticateJWT);

router.post(
  '/',
  requireRoles('STUDENT'),
  (req, res, next) => controller.createComplaint(req, res, next)
);

router.get(
  '/',
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.getWorkspaceComplaints(req, res, next)
);

router.patch(
  '/:id',
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF'),
  (req, res, next) => controller.updateComplaintStatus(req, res, next)
);

export default router;
