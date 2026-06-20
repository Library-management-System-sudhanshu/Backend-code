import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import { tenantIsolation } from '../middlewares/tenant.middleware';

const router = Router();
const controller = new WhatsAppController();

router.use(authenticateJWT);

router.get(
  '/templates',
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF'),
  (req, res, next) => controller.getTemplates(req, res, next)
);

router.post(
  '/broadcast',
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.sendBroadcast(req, res, next)
);

router.get(
  '/logs',
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.getLogs(req, res, next)
);

export default router;
