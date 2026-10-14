import { WorkspaceAccessGrant } from '../models/workspace-access-grant.model';
import {
  WorkspaceMembership,
  MembershipBranch,
} from '../models/workspace-membership.model';
import { addOwnerMembership } from './membership.service';
import { workspaceAccess } from './workspace-access.service';
import { Transaction, Op } from 'sequelize';
import { Workspace } from '../models/workspace.model';
import { Branch } from '../models/branch.model';
import { Shift } from '../models/shift.model';
import { SubscriptionPlan } from '../models/subscription-plan.model';
import { WorkspaceSetting } from '../models/workspace-setting.model';
import { WorkspaceSubscription } from '../models/workspace-subscription.model';
import { SaaSPlan } from '../models/saas-plan.model';
import { User } from '../models/user.model';
import { Room } from '../models/room.model';
import { Seat } from '../models/seat.model';
import { StudentProfile } from '../models/student-profile.model';
import { Payment } from '../models/payment.model';
import { Floor } from '../models/floor.model';
import { SeatAllocation } from '../models/seat-allocation.model';
import { Attendance } from '../models/attendance.model';
import { Book } from '../models/book.model';
import { BookIssue } from '../models/book-issue.model';
import { Complaint } from '../models/complaint.model';
import { Notice } from '../models/notice.model';
import { WhatsAppLog } from '../models/whatsapp-log.model';
import { StudentSubscription } from '../models/student-subscription.model';
import { UserDevice } from '../models/user-device.model';
import {
  NotFoundException,
  BadRequestException,
} from '../middlewares/error.middleware';
import { SaaSPayment } from '../models/saas-payment.model';
import sequelize from '../config/database';
import { createOrder, money, verifyCapturedPayment } from './razorpay';
import bcrypt from 'bcrypt';
export class WorkspaceService {
  async createWorkspace(data: any, transaction?: Transaction): Promise<any> {
    if (!transaction)
      return sequelize.transaction((t) => this.createWorkspace(data, t));
    const {
      name,
      subdomain,
      address,
      pincode,
      ownerName,
      ownerEmail,
      ownerPassword,
      ownerMobile,
    } = data;
    const existingWS = await Workspace.findOne({
      ...{ where: { subdomain } },
      transaction,
    });
    if (existingWS) {
      throw new BadRequestException('Subdomain is already registered');
    }
    const existingUser = await User.findOne({
      ...{ where: { email: ownerEmail } },
      transaction,
    });
    if (existingUser?.role === 'SUPER_ADMIN')
      throw new BadRequestException('Use a separate owner account');
    const workspace = await Workspace.create(
      {
        name,
        subdomain,
        address,
        pincode: pincode || null,
        isActive: true,
      } as any,
      { transaction },
    );
    const branch = await Branch.create(
      {
        workspaceId: workspace.id,
        name: 'Main Branch',
        address,
      } as any,
      { transaction },
    );
    await WorkspaceSetting.create(
      {
        workspaceId: workspace.id,
        themeColor: '#2563EB',
      } as any,
      { transaction },
    );
    const hashedPassword = existingUser
      ? undefined
      : await bcrypt.hash(ownerPassword, 10);
    const user =
      existingUser ||
      (await User.create(
        {
          workspaceId: workspace.id,
          branchId: branch.id,
          name: ownerName,
          email: ownerEmail,
          password: hashedPassword,
          mobile: ownerMobile || null,
          role: 'OWNER',
        } as any,
        { transaction },
      ));
    await addOwnerMembership(user.id, workspace.id, transaction);
    const subscription = await WorkspaceSubscription.findOne({
      where: { workspaceId: workspace.id },
      transaction,
    });
    return {
      workspace,
      owner: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      subscription,
    };
  }
  // Workspaces CRUD (Super Admin)
  async getAllWorkspaces() {
    const workspaces = await Workspace.findAll({
      include: [
        Branch,
        {
          model: WorkspaceMembership,
          where: { role: 'OWNER', status: 'ACTIVE' },
          required: false,
          include: [{ model: User, attributes: ['id', 'name', 'email'] }],
        },
      ],
      order: [['createdAt', 'ASC']],
    });
    return Promise.all(
      workspaces.map(async (ws) => {
        const sub = await WorkspaceSubscription.findOne({
          where: { workspaceId: ws.id },
          include: [SaaSPlan],
          order: [['createdAt', 'DESC']],
        });
        return {
          ...ws.toJSON(),
          users: (ws as any).memberships?.map((m: any) => m.user) || [],
          subscription: sub,
        };
      }),
    );
  }
  async getWorkspaceById(id: string) {
    const ws = await Workspace.findByPk(id, {
      include: [
        Branch,
        WorkspaceSetting,
        {
          model: WorkspaceMembership,
          where: { role: 'OWNER', status: 'ACTIVE' },
          required: false,
          include: [{ model: User, attributes: ['id', 'name', 'email'] }],
        },
      ],
    });
    if (!ws) throw new NotFoundException('Workspace not found');
    const sub = await WorkspaceSubscription.findOne({
      where: { workspaceId: ws.id },
      include: [SaaSPlan],
      order: [['createdAt', 'DESC']],
    });
    const studentCount = await StudentProfile.count({
      where: { workspaceId: id },
    });
    const branches = await Branch.findAll({ where: { workspaceId: id } });
    const branchIds = branches.map((b) => b.id);
    let roomCount = 0;
    let seatCount = 0;
    let roomList: any[] = [];
    if (branchIds.length > 0) {
      const floors = await Floor.findAll({ where: { branchId: branchIds } });
      const floorIds = floors.map((f) => f.id);
      if (floorIds.length > 0) {
        roomCount = await Room.count({ where: { floorId: floorIds } });
        roomList = await Room.findAll({
          where: { floorId: floorIds },
          include: [
            {
              model: Floor,
              include: [Branch],
            },
            Seat,
          ],
        });
        const roomIds = roomList.map((r) => r.id);
        if (roomIds.length > 0) {
          seatCount = await Seat.count({ where: { roomId: roomIds } });
        }
      }
    }
    const totalRevenue =
      (await Payment.sum('amount', {
        where: { workspaceId: id, status: 'PAID' },
      })) || 0;
    const payments = await Payment.findAll({
      where: { workspaceId: id },
      include: [
        {
          model: StudentProfile,
          include: [User],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    return {
      ...ws.toJSON(),
      users: (ws as any).memberships?.map((m: any) => m.user) || [],
      subscription: sub,
      metrics: {
        studentCount,
        roomCount,
        seatCount,
        totalRevenue,
      },
      rooms: roomList,
      payments,
    };
  }
  async updateWorkspace(id: string, data: any) {
    const ws = await Workspace.findByPk(id);
    if (!ws) throw new NotFoundException('Workspace not found');
    await ws.update(data);
    return ws;
  }
  async deleteWorkspace(id: string) {
    return sequelize.transaction(async (transaction) => {
      const workspace = await Workspace.findByPk(id, { transaction });
      if (!workspace) throw new NotFoundException('Workspace not found');

      // 1. Find all branches, floors, and rooms belonging to this workspace
      const branches = await Branch.findAll({
        where: { workspaceId: id },
        transaction,
      });
      const branchIds = branches.map((b) => b.id);

      let roomIds: string[] = [];
      let floorIds: string[] = [];
      if (branchIds.length > 0) {
        const floors = await Floor.findAll({
          where: { branchId: branchIds },
          transaction,
        });
        floorIds = floors.map((f) => f.id);
        if (floorIds.length > 0) {
          const rooms = await Room.findAll({
            where: { floorId: floorIds },
            transaction,
          });
          roomIds = rooms.map((r) => r.id);
        }
      }

      // 2. Delete seats, rooms, floors
      if (roomIds.length > 0) {
        await Seat.destroy({
          where: { roomId: roomIds },
          force: true,
          transaction,
        });
        await Room.destroy({
          where: { id: roomIds },
          force: true,
          transaction,
        });
      }
      if (floorIds.length > 0) {
        await Floor.destroy({
          where: { id: floorIds },
          force: true,
          transaction,
        });
      }

      // 3. Delete operational records for this workspace
      await SeatAllocation.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      await Attendance.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      await Payment.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      await StudentSubscription.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      await BookIssue.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      await Book.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      await Complaint.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      await Notice.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      await WhatsAppLog.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      await Shift.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      await SubscriptionPlan.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      await StudentProfile.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });

      // Collect all user IDs associated with this workspace before deleting relations
      const memberships = await WorkspaceMembership.findAll({
        where: { workspaceId: id },
        transaction,
      });
      const membershipIds = memberships.map((m) => m.id);
      const membershipUserIds = memberships.map((m) => m.userId);

      const studentProfiles = await StudentProfile.findAll({
        where: { workspaceId: id },
        transaction,
      });
      const studentUserIds = studentProfiles.map((s) => s.userId);

      const directUsers = await User.findAll({
        where: { workspaceId: id, role: { [Op.ne]: 'SUPER_ADMIN' } },
        transaction,
      });
      const directUserIds = directUsers.map((u) => u.id);

      const candidateUserIds = [
        ...new Set([...membershipUserIds, ...studentUserIds, ...directUserIds]),
      ];

      // 4. Delete memberships and membership branches
      if (membershipIds.length > 0) {
        await MembershipBranch.destroy({
          where: { membershipId: membershipIds },
          force: true,
          transaction,
        });
      }
      await WorkspaceMembership.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      await WorkspaceAccessGrant.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });

      // 5. Delete SaaS billing, settings, and branches
      await SaaSPayment.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      await WorkspaceSubscription.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      await WorkspaceSetting.destroy({
        where: { workspaceId: id },
        force: true,
        transaction,
      });
      if (branchIds.length > 0) {
        await Branch.destroy({
          where: { id: branchIds },
          force: true,
          transaction,
        });
      }

      // 6. Delete users belonging to this workspace (except SUPER_ADMIN)
      if (candidateUserIds.length > 0) {
        const usersToDelete = await User.findAll({
          where: {
            id: candidateUserIds,
            role: { [Op.ne]: 'SUPER_ADMIN' },
          },
          transaction,
        });

        for (const u of usersToDelete) {
          const otherMemberships = await WorkspaceMembership.count({
            where: {
              userId: u.id,
              workspaceId: { [Op.ne]: id },
            },
            transaction,
          });

          if (otherMemberships === 0) {
            await UserDevice.destroy({
              where: { userId: u.id },
              force: true,
              transaction,
            });
            await WorkspaceMembership.destroy({
              where: { userId: u.id },
              force: true,
              transaction,
            });
            await u.destroy({ force: true, transaction });
          }
        }
      }

      // 7. Permanently destroy the workspace
      await workspace.destroy({ force: true, transaction });

      return {
        success: true,
        message: 'Workspace and all associated records permanently deleted',
      };
    });
  }

  async deleteUser(userId: string) {
    return sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, { transaction });
      if (!user) throw new NotFoundException('User not found');
      if (user.role === 'SUPER_ADMIN') {
        throw new BadRequestException('Cannot delete a SUPER_ADMIN account');
      }

      // 1. Delete user devices
      await UserDevice.destroy({
        where: { userId },
        force: true,
        transaction,
      });

      // 2. Delete memberships and membership branches
      const memberships = await WorkspaceMembership.findAll({
        where: { userId },
        transaction,
      });
      const membershipIds = memberships.map((m) => m.id);
      if (membershipIds.length > 0) {
        await MembershipBranch.destroy({
          where: { membershipId: membershipIds },
          force: true,
          transaction,
        });
      }
      await WorkspaceMembership.destroy({
        where: { userId },
        force: true,
        transaction,
      });

      // 3. Delete student profile if exists and all student operational data
      const studentProfiles = await StudentProfile.findAll({
        where: { userId },
        transaction,
      });
      for (const profile of studentProfiles) {
        await SeatAllocation.destroy({
          where: { studentProfileId: profile.id },
          force: true,
          transaction,
        });
        await Attendance.destroy({
          where: { studentProfileId: profile.id },
          force: true,
          transaction,
        });
        await Payment.destroy({
          where: { studentProfileId: profile.id },
          force: true,
          transaction,
        });
        await StudentSubscription.destroy({
          where: { studentProfileId: profile.id },
          force: true,
          transaction,
        });
        await BookIssue.destroy({
          where: { studentProfileId: profile.id },
          force: true,
          transaction,
        });
        await Complaint.destroy({
          where: { studentProfileId: profile.id },
          force: true,
          transaction,
        });
        await profile.destroy({ force: true, transaction });
      }

      // 4. Clean up audit references where user is referenced
      await WorkspaceAccessGrant.destroy({
        where: { grantedById: userId },
        force: true,
        transaction,
      });
      await WorkspaceAccessGrant.update(
        { revokedById: null as any },
        { where: { revokedById: userId }, transaction },
      );
      await Notice.update(
        { createdById: null as any },
        { where: { createdById: userId }, transaction },
      );
      await Complaint.update(
        { resolvedById: null as any },
        { where: { resolvedById: userId }, transaction },
      );
      await BookIssue.update(
        { issuedById: null as any },
        { where: { issuedById: userId }, transaction },
      );

      // 5. Permanently delete user
      await user.destroy({ force: true, transaction });

      return {
        success: true,
        message: 'User account and all related records permanently deleted',
      };
    });
  }

  // Branches
  async getBranches(workspaceId: string, branchId?: string) {
    return Branch.findAll({
      where: { workspaceId, ...(branchId ? { id: branchId } : {}) },
      order: [['createdAt', 'ASC']],
    });
  }
  async createBranch(workspaceId: string, data: any) {
    return Branch.create({ ...data, workspaceId } as any);
  }
  async updateBranch(id: string, data: any) {
    const branch = await Branch.findByPk(id);
    if (!branch) throw new NotFoundException('Branch not found');
    await branch.update(
      Object.fromEntries(
        ['name', 'address']
          .filter((k) => data[k] !== undefined)
          .map((k) => [k, data[k]]),
      ),
    );
    return branch;
  }
  // Shifts
  async getShifts(workspaceId: string) {
    return Shift.findAll({
      where: { workspaceId },
      order: [['createdAt', 'ASC']],
    });
  }
  async createShift(workspaceId: string, data: any) {
    return Shift.create({ ...data, workspaceId } as any);
  }
  async updateShift(id: string, data: any) {
    const shift = await Shift.findByPk(id);
    if (!shift) throw new NotFoundException('Shift not found');
    await shift.update(
      Object.fromEntries(
        [
          'name',
          'startTime',
          'endTime',
          'capacity',
          'price',
          'price7Days',
          'price15Days',
          'price3Months',
          'price6Months',
          'customPricing',
          'type',
          'baseShiftIds',
        ]
          .filter((k) => data[k] !== undefined)
          .map((k) => [k, data[k]]),
      ),
    );
    return shift;
  }
  async deleteShift(id: string) {
    const shift = await Shift.findByPk(id);
    if (!shift) throw new NotFoundException('Shift not found');
    await shift.destroy();
    return { success: true };
  }
  // Subscription Plans
  async getPlans(workspaceId: string) {
    return SubscriptionPlan.findAll({
      where: { workspaceId },
      order: [['createdAt', 'ASC']],
    });
  }
  async createPlan(workspaceId: string, data: any) {
    return SubscriptionPlan.create({ ...data, workspaceId } as any);
  }
  async updatePlan(id: string, data: any) {
    const plan = await SubscriptionPlan.findByPk(id);
    if (!plan) throw new NotFoundException('Plan not found');
    await plan.update(
      Object.fromEntries(
        ['name', 'durationDays', 'price', 'isActive']
          .filter((k) => data[k] !== undefined)
          .map((k) => [k, data[k]]),
      ),
    );
    return plan;
  }
  // Settings
  async getSettings(workspaceId: string) {
    let setting = await WorkspaceSetting.findOne({ where: { workspaceId } });
    if (!setting) {
      return { workspaceId, themeColor: '#2563EB' } as WorkspaceSetting;
    }
    return setting;
  }
  async updateSettings(workspaceId: string, data: any) {
    const [setting] = await WorkspaceSetting.findOrCreate({
      where: { workspaceId },
      defaults: { workspaceId, themeColor: '#2563EB' } as any,
    });
    await setting.update(
      Object.fromEntries(
        ['receiptFormat', 'themeColor', 'upiId', 'qrCodeUrl']
          .filter((k) => data[k] !== undefined)
          .map((k) => [k, data[k]]),
      ),
    );
    return setting;
  }
  // SaaS Subscriptions (Trishul HQ)
  async getSaaSSubscription(workspaceId: string) {
    const subscription = await WorkspaceSubscription.findOne({
      where: { workspaceId },
      order: [['createdAt', 'DESC']],
    });
    return {
      ...(subscription?.toJSON() || {}),
      workspaceId,
      access: await workspaceAccess(workspaceId),
    };
  }
  async startSaaSTrial(
    workspaceId: string,
    days: number = 7,
    transaction?: Transaction,
  ): Promise<any> {
    if (!transaction)
      return sequelize.transaction((t) =>
        this.startSaaSTrial(workspaceId, days, t),
      );
    if (!Number.isInteger(days) || days < 1 || days > 365)
      throw new BadRequestException('Trial days must be between 1 and 365');
    const workspace = await Workspace.findByPk(workspaceId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    let sub = await WorkspaceSubscription.findOne({
      where: { workspaceId },
      transaction,
      order: [['createdAt', 'DESC']],
    });
    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(now.getDate() + days);
    if (sub) {
      if (sub.status !== 'TRIAL') {
        throw new Error('Workspace already has or had a subscription/trial.');
      }
      // If they already have a trial, maybe we are extending it?
      // Let's just update the trialEndDate if needed, but normally we wouldn't let them start again.
      // For now, let's just return the existing trial.
      return sub;
    }
    sub = await WorkspaceSubscription.create(
      {
        workspaceId,
        status: 'TRIAL',
        trialStartDate: now,
        trialEndDate: trialEnd,
      } as any,
      { transaction },
    );
    return sub;
  }
  async createSaaSPayment(workspaceId: string, saasPlanId: string) {
    const plan = await SaaSPlan.findOne({
      where: { id: saasPlanId, isActive: true },
    });
    if (!plan) throw new NotFoundException('SaaS Plan not found');
    if (!(await Workspace.findByPk(workspaceId)))
      throw new NotFoundException('Workspace not found');
    const payment = await SaaSPayment.create({
      workspaceId,
      saasPlanId,
      amount: money(plan.price),
      currency: 'INR',
      durationDays: plan.durationDays,
      status: 'PENDING',
    } as any);
    const order = await createOrder(Number(payment.amount), payment.id);
    await payment.update({ orderId: order.id });
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planId: plan.id,
      planName: plan.name,
    };
  }
  async verifySaaSPayment(workspaceId: string, data: any) {
    if (typeof data.razorpay_order_id !== 'string')
      throw new BadRequestException('Order ID required');
    const payment = await SaaSPayment.findOne({
      where: { workspaceId, orderId: data.razorpay_order_id },
    });
    if (!payment || (data.saasPlanId && data.saasPlanId !== payment.saasPlanId))
      throw new BadRequestException(
        'Payment order does not match this workspace and plan',
      );
    await verifyCapturedPayment(
      payment.orderId,
      data.razorpay_payment_id,
      data.razorpay_signature,
      Number(payment.amount),
    );
    return sequelize.transaction(async (transaction) => {
      // Serialize all renewals for this workspace, including distinct simultaneous orders.
      const workspace = await Workspace.findByPk(workspaceId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!workspace) throw new NotFoundException('Workspace not found');
      const locked = await SaaSPayment.findByPk(payment.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!locked) throw new NotFoundException('Payment not found');
      let sub = await WorkspaceSubscription.findOne({
        where: { workspaceId },
        order: [['createdAt', 'DESC']],
        transaction,
      });
      if (locked.status === 'PAID') {
        if (locked.paymentId !== data.razorpay_payment_id)
          throw new BadRequestException('Order already settled');
        return sub;
      }
      const now = new Date();
      const start =
        sub?.status === 'ACTIVE' &&
        sub.currentPeriodEnd &&
        sub.currentPeriodEnd > now
          ? sub.currentPeriodEnd
          : now;
      const values = {
        status: 'ACTIVE',
        saasPlanId: locked.saasPlanId,
        currentPeriodStart: now,
        currentPeriodEnd: new Date(
          start.getTime() + locked.durationDays * 86400000,
        ),
      };
      if (sub) await sub.update(values, { transaction });
      else
        sub = await WorkspaceSubscription.create(
          { workspaceId, ...values } as any,
          { transaction },
        );
      await WorkspaceAccessGrant.update(
        { revokedAt: now },
        { where: { workspaceId, revokedAt: null }, transaction },
      );
      await locked.update(
        { status: 'PAID', paymentId: data.razorpay_payment_id, paidAt: now },
        { transaction },
      );
      return sub;
    });
  }
}
