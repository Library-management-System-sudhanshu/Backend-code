import { Router } from 'express';
import { LibraryController } from '../controllers/library.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import { tenantIsolation } from '../middlewares/tenant.middleware';

const router = Router();
const controller = new LibraryController();

router.use(authenticateJWT);

router.get(
  '/books',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  tenantIsolation,
  (req, res, next) => controller.listBooks(req, res, next)
);

router.post(
  '/books',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.createBook(req, res, next)
);

router.patch(
  '/books/:id',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  (req, res, next) => controller.updateBook(req, res, next)
);

router.delete(
  '/books/:id',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  (req, res, next) => controller.deleteBook(req, res, next)
);

router.post(
  '/books/issue',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.issueBook(req, res, next)
);

router.post(
  '/books/return/:issueId',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  (req, res, next) => controller.returnBook(req, res, next)
);

router.get(
  '/books/issued',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.getIssuedBooks(req, res, next)
);

router.get(
  '/books/student/:studentProfileId',
  requireRoles('STUDENT', 'OWNER', 'MANAGER', 'STAFF'),
  (req, res, next) => controller.getStudentIssuedBooks(req, res, next)
);

export default router;
