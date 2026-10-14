import { workspaceAccess } from '../services/workspace-access.service';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import {
  Branch,
  Workspace,
  StudentProfile,
  Floor,
  Room,
  Seat,
  Shift,
  SubscriptionPlan,
  Payment,
  SeatAllocation,
  Complaint,
  Book,
  BookIssue,
  Notice,
} from '../models';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from './error.middleware';

export type ResourceKind =
  | 'workspace'
  | 'branch'
  | 'floor'
  | 'room'
  | 'seat'
  | 'student'
  | 'shift'
  | 'plan'
  | 'payment'
  | 'allocation'
  | 'complaint'
  | 'book'
  | 'issue'
  | 'notice';
const models: Record<ResourceKind, any> = {
  workspace: Workspace,
  branch: Branch,
  floor: Floor,
  room: Room,
  seat: Seat,
  student: StudentProfile,
  shift: Shift,
  plan: SubscriptionPlan,
  payment: Payment,
  allocation: SeatAllocation,
  complaint: Complaint,
  book: Book,
  issue: BookIssue,
  notice: Notice,
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function assertResourceAccess(
  req: AuthenticatedRequest,
  kind: ResourceKind,
  id: unknown,
): Promise<any> {
  if (typeof id !== 'string' || !uuid.test(id))
    throw new BadRequestException(`Invalid ${kind} ID`);
  const user = req.user;
  if (!user) throw new ForbiddenException('Authentication required');
  const record = await models[kind].findByPk(id);
  if (!record) throw new NotFoundException('Record not found');
  if (user.role === 'SUPER_ADMIN') return record;
  if (!user.workspaceId)
    throw new ForbiddenException('Workspace membership required');

  if (kind === 'floor')
    await assertResourceAccess(req, 'branch', record.branchId);
  else if (kind === 'room')
    await assertResourceAccess(req, 'floor', record.floorId);
  else if (kind === 'seat')
    await assertResourceAccess(req, 'room', record.roomId);
  else {
    const workspaceId = kind === 'workspace' ? record.id : record.workspaceId;
    if (workspaceId !== user.workspaceId)
      throw new NotFoundException('Record not found');
    const branchId = kind === 'branch' ? record.id : record.branchId;
    if (
      ['MANAGER', 'STAFF'].includes(user.role) &&
      branchId &&
      branchId !== user.branchId
    ) {
      throw new NotFoundException('Record not found');
    }
  }
  if (
    kind === 'student' &&
    user.role === 'STUDENT' &&
    record.userId !== user.id
  ) {
    throw new NotFoundException('Record not found');
  }
  if (record.studentProfileId)
    await assertResourceAccess(req, 'student', record.studentProfileId);
  if (kind === 'allocation')
    await assertResourceAccess(req, 'seat', record.seatId);
  return record;
}

/** Mount on each route, after Express has populated that route's parameters. */
export const tenantIsolation = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) throw new ForbiddenException('Authentication required');
    if (user.role === 'SUPER_ADMIN') {
      next();
      return;
    }
    if (!user.workspaceId)
      throw new ForbiddenException('Workspace membership required');
    const workspace = await Workspace.findByPk(user.workspaceId);
    if (!workspace?.isActive)
      throw new ForbiddenException('Workspace is disabled. Access denied.');
    const recoveryRoute =
      req.baseUrl.endsWith('/workspaces') &&
      [
        '/:id/saas-subscription',
        '/:id/saas-payment/create',
        '/:id/saas-payment/verify',
        '/:id/start-trial',
      ].includes(req.route?.path);
    if (!recoveryRoute) {
      const access = await workspaceAccess(user.workspaceId);
      if (
        access.mode === 'BLOCKED' ||
        (access.mode === 'READ_ONLY' &&
          !['GET', 'HEAD', 'OPTIONS'].includes(req.method))
      ) {
        throw new ForbiddenException(
          `Library access ${access.mode}: ${access.reason}`,
        );
      }
    }
    if (['MANAGER', 'STAFF'].includes(user.role)) {
      if (!user.branchId)
        throw new ForbiddenException('Branch assignment required');
      await assertResourceAccess(req, 'branch', user.branchId);
    }
    if (req.params.workspaceId)
      await assertResourceAccess(req, 'workspace', req.params.workspaceId);
    const references: Record<string, ResourceKind> = {
      branchId: 'branch',
      floorId: 'floor',
      roomId: 'room',
      seatId: 'seat',
      targetSeatId: 'seat',
      studentProfileId: 'student',
      shiftId: 'shift',
      filterShiftId: 'shift',
      subscriptionPlanId: 'plan',
      allocationId: 'allocation',
      bookId: 'book',
      issueId: 'issue',
    };
    for (const [key, kind] of Object.entries(references)) {
      for (const source of [
        req.params,
        req.query,
        req.body,
        req.body?.filters,
      ]) {
        const value = source?.[key];
        if (value !== undefined && value !== null && value !== '')
          await assertResourceAccess(req, kind, value);
      }
    }
    if (req.body?.baseShiftIds !== undefined) {
      if (!Array.isArray(req.body.baseShiftIds))
        throw new BadRequestException('baseShiftIds must be an array');
      for (const id of req.body.baseShiftIds)
        await assertResourceAccess(req, 'shift', id);
    }
    if (req.body?.studentIds !== undefined) {
      if (!Array.isArray(req.body.studentIds))
        throw new BadRequestException('studentIds must be an array');
      for (const id of req.body.studentIds)
        await assertResourceAccess(req, 'student', id);
    }
    const query = { ...req.query, workspaceId: user.workspaceId } as any;
    req.body = { ...(req.body || {}), workspaceId: user.workspaceId };
    if (['MANAGER', 'STAFF'].includes(user.role)) {
      query.branchId = user.branchId;
      req.body.branchId = user.branchId;
      req.body.filters = {
        ...(req.body.filters || {}),
        branchId: user.branchId,
      };
    }
    if (user.role === 'STUDENT') {
      const profile = await StudentProfile.findOne({
        where: { userId: user.id, workspaceId: user.workspaceId },
      });
      if (!profile) throw new ForbiddenException('Student enrollment required');
      query.studentProfileId = profile.id;
      req.body.studentProfileId = profile.id;
    }
    Object.defineProperty(req, 'query', {
      value: query,
      writable: true,
      configurable: true,
    });
    next();
  } catch (error) {
    next(error);
  }
};

export const resourceAccess =
  (kind: ResourceKind, key = 'id') =>
  async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await assertResourceAccess(req, kind, req.params[key]);
      next();
    } catch (error) {
      next(error);
    }
  };
