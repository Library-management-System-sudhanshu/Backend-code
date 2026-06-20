import { Router } from 'express';
import { SeatController } from '../controllers/seat.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';

const router = Router();
const controller = new SeatController();

router.use(authenticateJWT);

router.get(
  '/map/:branchId',
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  (req, res, next) => controller.getSeatMap(req, res, next)
);

router.post(
  '/floors',
  requireRoles('WORKSPACE_OWNER', 'MANAGER'),
  (req, res, next) => controller.addFloor(req, res, next)
);

router.post(
  '/rooms',
  requireRoles('WORKSPACE_OWNER', 'MANAGER'),
  (req, res, next) => controller.addRoom(req, res, next)
);

router.post(
  '/seats',
  requireRoles('WORKSPACE_OWNER', 'MANAGER'),
  (req, res, next) => controller.addSeat(req, res, next)
);

router.delete(
  '/rooms/:id',
  requireRoles('WORKSPACE_OWNER', 'MANAGER'),
  (req, res, next) => controller.deleteRoom(req, res, next)
);

router.delete(
  '/floors/:id',
  requireRoles('WORKSPACE_OWNER', 'MANAGER'),
  (req, res, next) => controller.deleteFloor(req, res, next)
);

router.delete(
  '/:id',
  requireRoles('WORKSPACE_OWNER', 'MANAGER'),
  (req, res, next) => controller.deleteSeat(req, res, next)
);

router.patch(
  '/:id/status',
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF'),
  (req, res, next) => controller.updateSeatStatus(req, res, next)
);

router.post(
  '/allocate',
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF'),
  (req, res, next) => controller.allocateSeat(req, res, next)
);

router.post(
  '/transfer',
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF'),
  (req, res, next) => controller.transferSeat(req, res, next)
);

router.post(
  '/check-expirations',
  requireRoles('WORKSPACE_OWNER', 'MANAGER', 'STAFF'),
  (req, res, next) => controller.checkExpirations(req, res, next)
);

export default router;
