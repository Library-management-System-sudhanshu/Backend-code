import { Router } from 'express';
import { SeatController } from '../controllers/seat.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import {
  tenantIsolation,
  resourceAccess,
} from '../middlewares/tenant.middleware';

const router = Router();
const controller = new SeatController();

router.use(authenticateJWT);

router.get(
  '/map/:branchId',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  tenantIsolation,
  (req, res, next) => controller.getSeatMap(req, res, next),
);

router.get(
  '/layout/:branchId',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  tenantIsolation,
  (req, res, next) => controller.getBranchLayout(req, res, next),
);

router.get(
  '/room/:roomId',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  tenantIsolation,
  (req, res, next) => controller.getRoomSeats(req, res, next),
);

router.post(
  '/floors',
  requireRoles('OWNER', 'MANAGER'),
  tenantIsolation,
  (req, res, next) => controller.addFloor(req, res, next),
);

router.post(
  '/rooms',
  requireRoles('OWNER', 'MANAGER'),
  tenantIsolation,
  (req, res, next) => controller.addRoom(req, res, next),
);

router.post(
  '/seats',
  requireRoles('OWNER', 'MANAGER'),
  tenantIsolation,
  (req, res, next) => controller.addSeat(req, res, next),
);

router.put(
  '/layout',
  requireRoles('OWNER', 'MANAGER'),
  tenantIsolation,
  (req, res, next) => controller.updateLayout(req, res, next),
);

router.delete(
  '/rooms/:id',
  requireRoles('OWNER', 'MANAGER'),
  tenantIsolation,
  resourceAccess('room', 'id'),
  (req, res, next) => controller.deleteRoom(req, res, next),
);

router.delete(
  '/floors/:id',
  requireRoles('OWNER', 'MANAGER'),
  tenantIsolation,
  resourceAccess('floor', 'id'),
  (req, res, next) => controller.deleteFloor(req, res, next),
);

router.patch(
  '/floors/:id',
  requireRoles('OWNER', 'MANAGER'),
  tenantIsolation,
  resourceAccess('floor', 'id'),
  (req, res, next) => controller.updateFloor(req, res, next),
);

router.patch(
  '/rooms/:id',
  requireRoles('OWNER', 'MANAGER'),
  tenantIsolation,
  resourceAccess('room', 'id'),
  (req, res, next) => controller.updateRoom(req, res, next),
);

router.delete(
  '/:id',
  requireRoles('OWNER', 'MANAGER'),
  tenantIsolation,
  resourceAccess('seat', 'id'),
  (req, res, next) => controller.deleteSeat(req, res, next),
);

router.patch(
  '/:id/status',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  resourceAccess('seat', 'id'),
  (req, res, next) => controller.updateSeatStatus(req, res, next),
);

router.post(
  '/allocate',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  tenantIsolation,
  (req, res, next) => controller.allocateSeat(req, res, next),
);

router.post(
  '/transfer',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  tenantIsolation,
  (req, res, next) => controller.transferSeat(req, res, next),
);

router.post(
  '/:id/vacate',
  requireRoles('OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
  tenantIsolation,
  resourceAccess('seat', 'id'),
  (req, res, next) => controller.vacateSeat(req, res, next),
);

router.post(
  '/check-expirations',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  (req, res, next) => controller.checkExpirations(req, res, next),
);

router.patch(
  '/allocations/:id',
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  resourceAccess('allocation', 'id'),
  (req, res, next) => controller.updateAllocation(req, res, next),
);

export default router;
