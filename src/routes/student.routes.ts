import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import { tenantIsolation } from '../middlewares/tenant.middleware';

const router = Router();
const controller = new StudentController();

// Public route
router.post('/self-register', (req, res, next) => controller.selfRegister(req, res, next));

// Authenticated routes below
router.use(authenticateJWT);

router.get(
  '/',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.listStudents(req, res, next)
);

router.get(
  '/:id',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  (req, res, next) => controller.getStudentById(req, res, next)
);

router.get(
  '/user/:userId',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  (req, res, next) => controller.getStudentByUserId(req, res, next)
);

router.post(
  '/',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.createStudent(req, res, next)
);

router.patch(
  '/:id',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  (req, res, next) => controller.updateStudent(req, res, next)
);

router.patch(
  '/:id/status',
  requireRoles('OWNER', 'MANAGER'),
  (req, res, next) => controller.updateStatus(req, res, next)
);

router.delete(
  '/:id',
  requireRoles('OWNER', 'MANAGER'),
  (req, res, next) => controller.deleteStudent(req, res, next)
);

router.post(
  '/:id/clear-dues',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  (req, res, next) => controller.clearDues(req, res, next)
);

export default router;
