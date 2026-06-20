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
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.listStudents(req, res, next)
);

router.get(
  '/:id',
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  (req, res, next) => controller.getStudentById(req, res, next)
);

router.get(
  '/user/:userId',
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  (req, res, next) => controller.getStudentByUserId(req, res, next)
);

router.post(
  '/',
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.createStudent(req, res, next)
);

router.patch(
  '/:id',
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  (req, res, next) => controller.updateStudent(req, res, next)
);

router.patch(
  '/:id/status',
  requireRoles('WORKSPACE_OWNER', 'MANAGER'),
  (req, res, next) => controller.updateStatus(req, res, next)
);

router.delete(
  '/:id',
  requireRoles('WORKSPACE_OWNER', 'MANAGER'),
  (req, res, next) => controller.deleteStudent(req, res, next)
);

export default router;
