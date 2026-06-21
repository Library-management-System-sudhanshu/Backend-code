import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import { tenantIsolation } from '../middlewares/tenant.middleware';

const router = Router();
const controller = new PaymentController();

router.use(authenticateJWT);

router.post(
  '/',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  (req, res, next) => controller.createPayment(req, res, next)
);

router.post(
  '/:id/verify',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  (req, res, next) => controller.verifyRazorpay(req, res, next)
);

router.post(
  '/:id/manual',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  (req, res, next) => controller.recordManualPayment(req, res, next)
);

router.get(
  '/',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  tenantIsolation,
  (req, res, next) => controller.getPayments(req, res, next)
);

router.get(
  '/report',
  requireRoles('OWNER', 'MANAGER'),
  tenantIsolation,
  (req, res, next) => controller.getCollectionReport(req, res, next)
);

export default router;
