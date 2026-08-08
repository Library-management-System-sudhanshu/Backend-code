import { Router } from 'express';
import { SmsController } from '../controllers/sms.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import { tenantIsolation } from '../middlewares/tenant.middleware';

const router = Router();
const controller = new SmsController();

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
