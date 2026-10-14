import bcrypt from 'bcrypt';
import sequelize from '../config/database';
import { Workspace } from '../models/workspace.model';
import { User } from '../models/user.model';
import { Branch } from '../models/branch.model';
import {
  WorkspaceMembership,
  MembershipBranch,
} from '../models/workspace-membership.model';
import { WorkspaceAccessGrant } from '../models/workspace-access-grant.model';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '../middlewares/error.middleware';

export class WorkspaceAdminService {
  async listMembers(workspaceId: string) {
    return WorkspaceMembership.findAll({
      where: { workspaceId },
      include: [
        { model: User, attributes: ['id', 'name', 'email'] },
        MembershipBranch,
      ],
    });
  }
  async assignStaff(workspaceId: string, data: any) {
    if (
      !['MANAGER', 'STAFF'].includes(data.role) ||
      typeof data.email !== 'string' ||
      !data.email.trim()
    )
      throw new BadRequestException(
        'Email and manager/staff role are required',
      );
    if (
      !Array.isArray(data.branchIds) ||
      !data.branchIds.length ||
      data.branchIds.some((id: unknown) => typeof id !== 'string')
    )
      throw new BadRequestException('Assign at least one branch');
    const branchIds = [...new Set<string>(data.branchIds)];
    if (data.status && !['ACTIVE', 'INACTIVE'].includes(data.status))
      throw new BadRequestException('Invalid membership status');
    return sequelize.transaction(async (transaction) => {
      const workspace = await Workspace.findByPk(workspaceId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!workspace) throw new NotFoundException('Library not found');
      const branches = await Branch.findAll({
        where: { id: branchIds, workspaceId },
        transaction,
      });
      if (branches.length !== branchIds.length)
        throw new BadRequestException(
          'All assigned branches must belong to this library',
        );
      let user = await User.findOne({
        where: { email: data.email.trim().toLowerCase() },
        transaction,
      });
      if (!user) {
        if (
          typeof data.password !== 'string' ||
          data.password.length < 10 ||
          !data.name
        )
          throw new BadRequestException(
            'New staff accounts require a name and password of at least 10 characters',
          );
        user = await User.create(
          {
            email: data.email.trim().toLowerCase(),
            name: data.name,
            role: data.role,
            password: await bcrypt.hash(data.password, 10),
          } as any,
          { transaction },
        );
      }
      if (user.role === 'SUPER_ADMIN')
        throw new ForbiddenException(
          'Platform administrators cannot be assigned as staff',
        );
      let membership = await WorkspaceMembership.findOne({
        where: { userId: user.id, workspaceId },
        transaction,
      });
      if (membership && !['MANAGER', 'STAFF'].includes(membership.role))
        throw new BadRequestException(
          'An owner or student membership cannot be replaced by a staff assignment',
        );
      if (membership)
        await membership.update(
          { role: data.role, status: data.status || 'ACTIVE' },
          { transaction },
        );
      else
        membership = await WorkspaceMembership.create(
          {
            userId: user.id,
            workspaceId,
            role: data.role,
            status: data.status || 'ACTIVE',
          } as any,
          { transaction },
        );
      await MembershipBranch.destroy({
        where: { membershipId: membership.id },
        transaction,
      });
      await MembershipBranch.bulkCreate(
        branchIds.map((branchId) => ({
          membershipId: membership!.id,
          branchId,
        })) as any,
        { transaction },
      );
      return { membership, branchIds };
    });
  }
  async grantGrace(workspaceId: string, actorId: string, data: any) {
    const actor = await User.findByPk(actorId);
    if (actor?.role !== 'SUPER_ADMIN')
      throw new ForbiddenException('Only the super admin may grant grace');
    const expiresAt = new Date(data.expiresAt);
    if (
      !['READ_ONLY', 'FULL'].includes(data.mode) ||
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt <= new Date() ||
      typeof data.reason !== 'string' ||
      !data.reason.trim()
    )
      throw new BadRequestException(
        'Provide mode, future expiresAt, and reason',
      );
    return sequelize.transaction(async (transaction) => {
      if (
        !(await Workspace.findByPk(workspaceId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        }))
      )
        throw new NotFoundException('Library not found');
      await WorkspaceAccessGrant.update(
        { revokedAt: new Date(), revokedById: actorId },
        { where: { workspaceId, revokedAt: null }, transaction },
      );
      return WorkspaceAccessGrant.create(
        {
          workspaceId,
          grantedById: actorId,
          mode: data.mode,
          expiresAt,
          reason: data.reason.trim(),
        } as any,
        { transaction },
      );
    });
  }
  async revokeGrace(workspaceId: string, actorId: string) {
    const actor = await User.findByPk(actorId);
    if (actor?.role !== 'SUPER_ADMIN')
      throw new ForbiddenException('Only the super admin may revoke grace');
    return sequelize.transaction(async (transaction) => {
      await Workspace.findByPk(workspaceId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      await WorkspaceAccessGrant.update(
        { revokedAt: new Date(), revokedById: actorId },
        { where: { workspaceId, revokedAt: null }, transaction },
      );
      return { success: true };
    });
  }
}
