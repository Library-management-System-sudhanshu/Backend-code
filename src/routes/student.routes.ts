import { Router } from 'express';
import { StudentController } from '../controllers/student.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import {
  tenantIsolation,
  resourceAccess,
} from '../middlewares/tenant.middleware';

import { StudentService } from '../services/student.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const router = Router();
const controller = new StudentController();

// Public route
router.post('/self-register', (req, res, next) =>
  controller.selfRegister(req, res, next),
);

router.post('/join', authenticateJWT, async (req, res, next) => {
  try {
    res
      .status(201)
      .json(
        await new StudentService().joinLibrary(
          (req as AuthenticatedRequest).user!.id,
          req.body,
        ),
      );
  } catch (error) {
    next(error);
  }
});
// Authenticated routes below
router.use(authenticateJWT);

router.get(
  '/',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.listStudents(req, res, next),
);

router.get(
  '/:id',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  tenantIsolation,
  resourceAccess('student', 'id'),
  (req, res, next) => controller.getStudentById(req, res, next),
);

router.get(
  '/user/:userId',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  tenantIsolation,
  (req, res, next) => controller.getStudentByUserId(req, res, next),
);

router.post(
  '/',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.createStudent(req, res, next),
);

router.patch(
  '/:id',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  tenantIsolation,
  resourceAccess('student', 'id'),
  (req, res, next) => controller.updateStudent(req, res, next),
);

router.patch(
  '/:id/status',
  requireRoles('OWNER', 'MANAGER'),
  tenantIsolation,
  resourceAccess('student', 'id'),
  (req, res, next) => controller.updateStatus(req, res, next),
);

router.delete(
  '/:id',
  requireRoles('OWNER', 'MANAGER'),
  tenantIsolation,
  resourceAccess('student', 'id'),
  (req, res, next) => controller.deleteStudent(req, res, next),
);

router.post(
  '/:id/clear-dues',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  resourceAccess('student', 'id'),
  (req, res, next) => controller.clearDues(req, res, next),
);

export default router;
