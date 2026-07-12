import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import { tenantIsolation } from '../middlewares/tenant.middleware';

const router = Router();
const controller = new DashboardController();

router.use(authenticateJWT);

router.get(
  '/metrics',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.getMetrics(req, res, next)
);

router.get(
  '/super-admin/metrics',
  requireRoles('SUPER_ADMIN'),
  (req, res, next) => controller.getSuperAdminMetrics(req, res, next)
);

export default router;
