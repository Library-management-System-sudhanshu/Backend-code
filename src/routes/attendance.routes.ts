import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import { tenantIsolation } from '../middlewares/tenant.middleware';

const router = Router();
const controller = new AttendanceController();

router.use(authenticateJWT);

router.post(
  '/check-in',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  (req, res, next) => controller.checkIn(req, res, next)
);

router.post(
  '/check-out',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  (req, res, next) => controller.checkOut(req, res, next)
);

router.get(
  '/daily',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.getDailyAttendance(req, res, next)
);

router.get(
  '/student/:studentProfileId',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  (req, res, next) => controller.getStudentAttendanceHistory(req, res, next)
);

export default router;
