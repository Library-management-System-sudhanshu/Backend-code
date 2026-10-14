import { Transaction } from 'sequelize';
import {
  WorkspaceMembership,
  MembershipBranch,
} from '../models/workspace-membership.model';
import { Workspace } from '../models/workspace.model';
import { Branch } from '../models/branch.model';
import { User, UserRole } from '../models/user.model';
import { StudentProfile } from '../models/student-profile.model';
import { WorkspaceSubscription } from '../models/workspace-subscription.model';
import {
  BadRequestException,
  ForbiddenException,
} from '../middlewares/error.middleware';

export async function listMemberships(
  userId: string,
  transaction?: Transaction,
) {
  return WorkspaceMembership.findAll({
    where: { userId, status: 'ACTIVE' },
    include: [
      { model: Workspace },
      { model: MembershipBranch, include: [Branch] },
    ],
    order: [['createdAt', 'ASC']],
    transaction,
  });
}

export async function resolveMembership(
  user: User,
  workspaceId?: string,
  branchId?: string,
  transaction?: Transaction,
) {
  if (user.role === UserRole.SUPER_ADMIN)
    return { user, membership: null, branchIds: [] as string[] };
  const memberships = await listMemberships(user.id, transaction);
  const selected = workspaceId
    ? memberships.find((m) => m.workspaceId === workspaceId)
    : memberships.find(
        (m) =>
          m.workspace?.isActive &&
          (!['MANAGER', 'STAFF'].includes(m.role) || m.branches?.length),
      ) || memberships[0];
  if (!selected) {
    if (workspaceId)
      throw new ForbiddenException('No active membership in this library');
    user.setDataValue('workspaceId', null as any);
    user.setDataValue('branchId', null as any);
    user.setDataValue('workspace', null as any);
    return { user, membership: null, branchIds: [] as string[] };
  }
  const assigned = (selected.branches || [])
    .filter((b) => b.branch?.workspaceId === selected.workspaceId)
    .map((b) => b.branchId);
  let selectedBranch = branchId;
  if (['MANAGER', 'STAFF'].includes(selected.role)) {
    if (!assigned.length || (branchId && !assigned.includes(branchId)))
      throw new ForbiddenException('Branch is not assigned to this membership');
    selectedBranch = branchId || assigned[0];
  } else if (selected.role === 'STUDENT') {
    const profile = await StudentProfile.findOne({
      where: { userId: user.id, workspaceId: selected.workspaceId },
      transaction,
    });
    if (!profile)
      throw new ForbiddenException('Student enrollment unavailable');
    if (branchId && branchId !== profile.branchId)
      throw new ForbiddenException('Branch does not match enrollment');
    selectedBranch = profile.branchId;
  } else if (
    branchId &&
    !(await Branch.findOne({
      where: { id: branchId, workspaceId: selected.workspaceId },
      transaction,
    }))
  ) {
    throw new BadRequestException('Invalid branch');
  }
  // Request-local compatibility view; never save these legacy identity fields.
  user.setDataValue('workspaceId', selected.workspaceId);
  user.setDataValue('branchId', (selectedBranch || null) as any);
  user.setDataValue('role', selected.role as UserRole);
  user.setDataValue('workspace', selected.workspace);
  return { user, membership: selected, branchIds: assigned };
}

export async function addOwnerMembership(
  userId: string,
  workspaceId: string,
  transaction: Transaction,
) {
  await WorkspaceMembership.create(
    { userId, workspaceId, role: 'OWNER', status: 'ACTIVE' } as any,
    { transaction },
  );
  const now = new Date();
  await WorkspaceSubscription.create(
    {
      workspaceId,
      status: 'TRIAL',
      trialStartDate: now,
      trialEndDate: new Date(now.getTime() + 7 * 86400000),
    } as any,
    { transaction },
  );
}
