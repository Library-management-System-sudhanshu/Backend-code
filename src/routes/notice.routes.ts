import { Router } from 'express';
import { NoticeController } from '../controllers/notice.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import {
  tenantIsolation,
  resourceAccess,
} from '../middlewares/tenant.middleware';

const router = Router();
const controller = new NoticeController();

router.use(authenticateJWT);

router.post('/', requireRoles('OWNER'), tenantIsolation, (req, res, next) =>
  controller.createNotice(req, res, next),
);

router.get('/', tenantIsolation, (req, res, next) =>
  controller.getNotices(req, res, next),
);

router.delete(
  '/:id',
  requireRoles('OWNER'),
  tenantIsolation,
  resourceAccess('notice', 'id'),
  (req, res, next) => controller.deleteNotice(req, res, next),
);

export default router;
