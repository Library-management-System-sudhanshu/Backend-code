import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import { tenantIsolation } from '../middlewares/tenant.middleware';

const router = Router();
const controller = new EmailController();

router.use(authenticateJWT);

router.post(
  '/broadcast',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.sendBroadcast(req, res, next)
);

router.get(
  '/logs',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.getLogs(req, res, next)
);

export default router;
