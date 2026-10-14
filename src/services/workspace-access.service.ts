import { Op } from 'sequelize';
import { Workspace } from '../models/workspace.model';
import { WorkspaceSubscription } from '../models/workspace-subscription.model';
import { WorkspaceAccessGrant } from '../models/workspace-access-grant.model';
import { ForbiddenException } from '../middlewares/error.middleware';

export type AccessMode = 'FULL' | 'READ_ONLY' | 'BLOCKED';
export async function workspaceAccess(
  workspaceId: string,
  now = new Date(),
): Promise<{ mode: AccessMode; reason: string; until: Date | null }> {
  const workspace = await Workspace.findByPk(workspaceId);
  if (!workspace?.isActive)
    return { mode: 'BLOCKED', reason: 'WORKSPACE_DISABLED', until: null };
  const grant = await WorkspaceAccessGrant.findOne({
    where: { workspaceId, revokedAt: null, expiresAt: { [Op.gt]: now } },
    order: [['createdAt', 'DESC']],
  });
  if (grant)
    return { mode: grant.mode, reason: 'ADMIN_GRACE', until: grant.expiresAt };
  const subscription = await WorkspaceSubscription.findOne({
    where: { workspaceId },
    order: [['createdAt', 'DESC']],
  });
  if (!subscription || subscription.status === 'CANCELLED')
    return { mode: 'BLOCKED', reason: 'NO_ACTIVE_SUBSCRIPTION', until: null };
  const expiry = subscription.currentPeriodEnd || subscription.trialEndDate;
  if (!expiry || !Number.isFinite(new Date(expiry).getTime()))
    return { mode: 'BLOCKED', reason: 'MISSING_EXPIRY', until: null };
  const end = new Date(expiry);
  if (now < end) return { mode: 'FULL', reason: 'SUBSCRIPTION', until: end };
  const readOnlyUntil = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  if (now < readOnlyUntil)
    return {
      mode: 'READ_ONLY',
      reason: 'EXPIRED_READ_ONLY',
      until: readOnlyUntil,
    };
  return { mode: 'BLOCKED', reason: 'SUBSCRIPTION_EXPIRED', until: null };
}
export async function requireWorkspaceWrite(workspaceId: string) {
  const access = await workspaceAccess(workspaceId);
  if (access.mode !== 'FULL')
    throw new ForbiddenException(
      `Library is ${access.mode.toLowerCase()}: ${access.reason}`,
    );
}
