import { WorkspaceMembership } from '../models/workspace-membership.model';
import { requireWorkspaceWrite } from './workspace-access.service';
import crypto from 'node:crypto';
import { money } from './razorpay';
import { Transaction } from 'sequelize';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { User } from '../models/user.model';
import { StudentProfile, StudentStatus } from '../models/student-profile.model';
import { Workspace } from '../models/workspace.model';
import { Branch } from '../models/branch.model';
import { SeatAllocation } from '../models/seat-allocation.model';
import { Seat } from '../models/seat.model';
import { Shift } from '../models/shift.model';
import { StudentSubscription } from '../models/student-subscription.model';
import { Payment } from '../models/payment.model';
import { SubscriptionPlan } from '../models/subscription-plan.model';
import {
  NotFoundException,
  BadRequestException,
} from '../middlewares/error.middleware';
import sequelize from '../config/database';
export class StudentService {
  async joinLibrary(userId: string, data: any) {
    await requireWorkspaceWrite(data.workspaceId);
    return sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user) throw new NotFoundException('User not found');
      const branch = await Branch.findOne({
        where: { id: data.branchId, workspaceId: data.workspaceId },
        transaction,
      });
      if (!branch) throw new BadRequestException('Invalid library branch');
      const existing = await WorkspaceMembership.findOne({
        where: { userId, workspaceId: data.workspaceId },
        transaction,
      });
      if (
        existing &&
        (existing.role !== 'STUDENT' || existing.status === 'ACTIVE')
      )
        throw new BadRequestException('Already a member of this library');
      const profile = await StudentProfile.create(
        {
          userId,
          workspaceId: data.workspaceId,
          branchId: branch.id,
          displayName: data.name || user.name,
          contactEmail: user.email,
          contactMobile: data.mobile || user.mobile,
          avatar: data.avatar || user.avatar,
          guardianName: data.guardianName,
          guardianMobile: data.guardianMobile,
          address: data.address,
          gender: data.gender,
          status: 'PENDING',
          dueAmount: 0,
          joiningDate: new Date(),
        } as any,
        { transaction },
      );
      if (existing)
        await existing.update({ status: 'ACTIVE' }, { transaction });
      else
        await WorkspaceMembership.create(
          {
            userId,
            workspaceId: data.workspaceId,
            role: 'STUDENT',
            status: 'ACTIVE',
          } as any,
          { transaction },
        );
      return profile;
    });
  }
  async listStudents(workspaceId: string, query: any) {
    const { search, branchId, status, limit = 10, page = 1 } = query;
    const offset = (page - 1) * limit;
    const userWhere: any = {};
    const profileWhere: any = { workspaceId };
    if (search) {
      profileWhere[Op.or] = [
        { displayName: { [Op.iLike]: `%${search}%` } },
        { contactEmail: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (branchId) profileWhere.branchId = branchId;
    if (status) profileWhere.status = status;
    const { filterShiftId, filterExpiration } = query;
    const allocationWhere: any = { isActive: true };
    if (filterShiftId) {
      allocationWhere.shiftId = filterShiftId;
    }
    let requiredAllocation = filterShiftId ? true : false;
    if (filterExpiration) {
      if (filterExpiration === 'NO_SEAT') {
        profileWhere.id = {
          [Op.notIn]: sequelize.literal(`(
            SELECT "studentProfileId" 
            FROM "seat_allocations" 
            WHERE "isActive" = true
          )`),
        };
      } else {
        requiredAllocation = true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (filterExpiration === 'ACTIVE') {
          allocationWhere.endDate = { [Op.gte]: today };
        } else if (filterExpiration === 'EXPIRED') {
          allocationWhere.endDate = { [Op.lt]: today };
        } else if (filterExpiration === 'EXPIRING_SOON') {
          const sevenDaysLater = new Date(today);
          sevenDaysLater.setDate(today.getDate() + 7);
          allocationWhere.endDate = { [Op.between]: [today, sevenDaysLater] };
        }
      }
    }
    const { rows, count } = await StudentProfile.findAndCountAll({
      where: profileWhere,
      include: [
        {
          model: User,
          where: userWhere,
          attributes: ['id', 'name', 'email', 'mobile', 'avatar'],
        },
        {
          model: SeatAllocation,
          required: requiredAllocation,
          where: allocationWhere,
          include: [{ model: Seat }, { model: Shift }],
        },
        {
          model: StudentSubscription,
          required: false,
          include: [{ all: true }],
        },
        {
          model: Payment,
          required: false,
        },
      ],
      distinct: true,
      limit: Math.min(100, Math.max(1, Number(limit) || 10)),
      offset: Number(offset),
      order: [['createdAt', 'DESC']],
    });
    return {
      students: rows,
      total: count,
      page: Number(page),
      distinct: true,
      limit: Math.min(100, Math.max(1, Number(limit) || 10)),
    };
  }
  async getStudentById(id: string) {
    const student = await StudentProfile.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'mobile', 'avatar'],
        },
        { model: Branch },
        { model: SeatAllocation, include: [{ all: true }] },
        { model: StudentSubscription, include: [{ all: true }] },
        { model: Payment },
      ],
    });
    if (!student) throw new NotFoundException('Student profile not found');
    return student;
  }
  async getStudentByUserId(userId: string, workspaceId: string) {
    const student = await StudentProfile.findOne({
      where: { userId, workspaceId },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email', 'mobile', 'avatar'],
        },
        { model: Branch },
        { model: SeatAllocation, include: [{ all: true }] },
        { model: StudentSubscription, include: [{ all: true }] },
      ],
    });
    if (!student) throw new NotFoundException('Student profile not found');
    return student;
  }
  async registerStudent(
    data: any,
    isSelfRegistration = false,
    transaction?: Transaction,
  ): Promise<any> {
    if (!transaction)
      return sequelize.transaction((t) =>
        this.registerStudent(data, isSelfRegistration, t),
      );
    const branch = await Branch.findOne({
      ...{ where: { id: data.branchId, workspaceId: data.workspaceId } },
      transaction,
    });
    if (!branch)
      throw new BadRequestException('Branch does not belong to this workspace');
    const workspace = await Workspace.findByPk(data.workspaceId, {
      transaction,
    });
    if (!workspace?.isActive)
      throw new BadRequestException('Workspace is unavailable');
    await requireWorkspaceWrite(data.workspaceId);
    if (isSelfRegistration) {
      if (typeof data.password !== 'string' || data.password.length < 10)
        throw new BadRequestException(
          'Choose a password of at least 10 characters',
        );
      // Public admission may request enrollment, never record money or grant a subscription.
      data = {
        ...data,
        subscriptionPlanId: undefined,
        shiftId: undefined,
        amountPaid: undefined,
        discountAmount: undefined,
        joiningDate: undefined,
      };
    }
    if (
      data.subscriptionPlanId &&
      !(await SubscriptionPlan.findOne({
        ...{
          where: {
            id: data.subscriptionPlanId,
            workspaceId: data.workspaceId,
            isActive: true,
          },
        },
        transaction,
      }))
    ) {
      throw new BadRequestException('Invalid subscription plan');
    }
    if (
      data.shiftId &&
      !(await Shift.findOne({
        ...{ where: { id: data.shiftId, workspaceId: data.workspaceId } },
        transaction,
      }))
    ) {
      throw new BadRequestException('Invalid shift');
    }
    if (!data.email || !data.email.trim()) {
      data.email = `${data.mobile || Date.now()}@studyflow.com`;
    }
    const existingUser = await User.findOne({
      ...{ where: { email: data.email } },
      transaction,
    });
    if (existingUser) {
      throw new BadRequestException(
        'An account with this email already exists. Ask the student to sign in and submit a library join request.',
      );
    }
    const hashedPassword = await bcrypt.hash(
      data.password || crypto.randomBytes(32).toString('base64url'),
      10,
    );
    // Create User
    const user = await User.create(
      {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        mobile: data.mobile,
        role: 'STUDENT',
        workspaceId: data.workspaceId,
        branchId: data.branchId,
        avatar: data.avatar || null,
      } as any,
      { transaction },
    );
    // Mock QR Code link
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${user.id}`;
    // Create StudentProfile
    const profile = await StudentProfile.create(
      {
        displayName: data.name,
        contactEmail: data.email,
        contactMobile: data.mobile,
        avatar: data.avatar,
        userId: user.id,
        workspaceId: data.workspaceId,
        branchId: data.branchId,
        guardianName: data.guardianName,
        guardianMobile: data.guardianMobile,
        aadharNumber: data.aadharNumber,
        gender: data.gender || null,
        address: data.address || null,
        status: isSelfRegistration ? 'PENDING' : 'APPROVED',
        qrCodeUrl,
        joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
        dueAmount: 0,
      } as any,
      { transaction },
    );
    await WorkspaceMembership.create(
      {
        userId: user.id,
        workspaceId: profile.workspaceId,
        role: 'STUDENT',
        status: 'ACTIVE',
      } as any,
      { transaction },
    );
    // Create subscription and payment if plan is selected
    if (data.subscriptionPlanId) {
      const plan = await SubscriptionPlan.findByPk(data.subscriptionPlanId, {
        transaction,
      });
      if (plan) {
        const startDate = data.joiningDate
          ? new Date(data.joiningDate)
          : new Date();
        const endDate = new Date(
          startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000,
        );
        const subscription = await StudentSubscription.create(
          {
            workspaceId: data.workspaceId,
            studentProfileId: profile.id,
            subscriptionPlanId: data.subscriptionPlanId,
            startDate,
            endDate,
            status: 'ACTIVE',
          } as any,
          { transaction },
        );
        const amountPaid = money(
          data.amountPaid ?? plan.price,
          'Amount paid',
          true,
        );
        const discountAmount = money(
          data.discountAmount ?? 0,
          'Discount',
          true,
        );
        if (amountPaid + discountAmount > Number(plan.price))
          throw new BadRequestException('Payment and discount exceed price');
        const dueAmount = Math.max(
          0,
          Number(plan.price) - amountPaid - discountAmount,
        );
        if (dueAmount > 0) {
          await profile.update(
            { dueAmount: Number(profile.dueAmount || 0) + dueAmount },
            { transaction },
          );
        }
        await Payment.create(
          {
            workspaceId: data.workspaceId,
            branchId: data.branchId,
            studentProfileId: profile.id,
            amount: amountPaid,
            studentSubscriptionId: subscription.id,
            subscriptionPlanId: plan.id,
            totalAmount: Number(plan.price),
            discountAmount,
            method: 'CASH',
            status: dueAmount > 0 ? 'PARTIAL' : 'PAID',
            paidAt: data.joiningDate ? new Date(data.joiningDate) : new Date(),
            transactionId: `CASH-REG-${Date.now()}`,
            invoiceUrl: `https://studyflow-receipts.s3.amazonaws.com/invoice_${Date.now()}.pdf`,
            dueDate: new Date(
              (data.joiningDate
                ? new Date(data.joiningDate).getTime()
                : Date.now()) +
                7 * 24 * 60 * 60 * 1000,
            ),
          } as any,
          { transaction },
        );
      }
    } else if (data.shiftId) {
      const shift = await Shift.findByPk(data.shiftId, { transaction });
      if (shift) {
        // Find or create a SubscriptionPlan corresponding to this shift
        const inputDuration = Number(data.durationDays ?? 30);
        if (
          !Number.isInteger(inputDuration) ||
          inputDuration < 1 ||
          inputDuration > 3650
        )
          throw new BadRequestException('Invalid duration');
        const inputPrice = money(data.shiftPrice ?? shift.price, 'Price');
        let plan = await SubscriptionPlan.findOne({
          ...{
            where: {
              name: `${shift.name} Plan (${inputDuration} Days)`,
              workspaceId: data.workspaceId,
              price: inputPrice,
            },
          },
          transaction,
        });
        if (!plan) {
          plan = await SubscriptionPlan.create(
            {
              name: `${shift.name} Plan (${inputDuration} Days)`,
              workspaceId: data.workspaceId,
              price: inputPrice,
              durationDays: inputDuration,
              isActive: true,
            } as any,
            { transaction },
          );
        }
        const startDate = data.joiningDate
          ? new Date(data.joiningDate)
          : new Date();
        const endDate = new Date(
          startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000,
        );
        const subscription = await StudentSubscription.create(
          {
            workspaceId: data.workspaceId,
            studentProfileId: profile.id,
            subscriptionPlanId: plan.id,
            startDate,
            endDate,
            status: 'ACTIVE',
          } as any,
          { transaction },
        );
        const amountPaid = money(
          data.amountPaid ?? inputPrice,
          'Amount paid',
          true,
        );
        const discountAmount = money(
          data.discountAmount ?? 0,
          'Discount',
          true,
        );
        if (amountPaid + discountAmount > Number(inputPrice))
          throw new BadRequestException('Payment and discount exceed price');
        const dueAmount = Math.max(
          0,
          Number(inputPrice) - amountPaid - discountAmount,
        );
        if (dueAmount > 0) {
          await profile.update(
            { dueAmount: Number(profile.dueAmount || 0) + dueAmount },
            { transaction },
          );
        }
        await Payment.create(
          {
            workspaceId: data.workspaceId,
            branchId: data.branchId,
            studentProfileId: profile.id,
            amount: amountPaid,
            studentSubscriptionId: subscription.id,
            subscriptionPlanId: plan.id,
            totalAmount: Number(plan.price),
            discountAmount,
            method: 'CASH',
            status: dueAmount > 0 ? 'PARTIAL' : 'PAID',
            paidAt: new Date(),
            transactionId: `CASH-REG-SHIFT-${Date.now()}`,
            invoiceUrl: `https://studyflow-receipts.s3.amazonaws.com/invoice_${Date.now()}.pdf`,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          } as any,
          { transaction },
        );
      }
    }
    return {
      user: {
        id: user.id,
        name: profile.displayName,
        email: profile.contactEmail,
        mobile: profile.contactMobile,
        avatar: profile.avatar,
      },
      profile,
    };
  }
  async updateStudent(
    id: string,
    data: any,
    transaction?: Transaction,
  ): Promise<any> {
    if (!transaction)
      return sequelize.transaction((t) => this.updateStudent(id, data, t));
    const profile = await StudentProfile.findByPk(id, {
      ...{ include: [User] },
      transaction,
    });
    if (!profile) throw new NotFoundException('Student profile not found');
    const user = profile.user;
    if (
      data.branchId &&
      !(await Branch.findOne({
        where: { id: data.branchId, workspaceId: profile.workspaceId },
        transaction,
      }))
    ) {
      throw new BadRequestException('Branch does not belong to this workspace');
    }
    await profile.update(
      {
        displayName: data.name ?? profile.displayName,
        contactEmail: data.email ?? profile.contactEmail,
        contactMobile: data.mobile ?? profile.contactMobile,
        avatar: data.avatar ?? profile.avatar,
        guardianName: data.guardianName ?? profile.guardianName,
        guardianMobile: data.guardianMobile ?? profile.guardianMobile,
        aadharNumber: data.aadharNumber ?? profile.aadharNumber,
        gender: data.gender ?? profile.gender,
        address: data.address ?? profile.address,
        branchId: data.branchId ?? profile.branchId,
        status: data.status ?? profile.status,
        joiningDate: data.joiningDate ?? profile.joiningDate,
      },
      { transaction },
    );
    return {
      user: {
        id: user.id,
        name: profile.displayName,
        email: profile.contactEmail,
        mobile: profile.contactMobile,
        avatar: profile.avatar,
      },
      profile,
    };
  }
  async updateStatus(id: string, status: StudentStatus) {
    const profile = await StudentProfile.findByPk(id);
    if (!profile) throw new NotFoundException('Student profile not found');
    await profile.update({ status });
    return profile;
  }
  async deleteStudent(id: string, transaction?: Transaction): Promise<any> {
    if (!transaction)
      return sequelize.transaction((t) => this.deleteStudent(id, t));
    const profile = await StudentProfile.findByPk(id, { transaction });
    if (!profile) throw new NotFoundException('Student profile not found');
    const userId = profile.userId;
    await Workspace.findByPk(profile.workspaceId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const allocations = await SeatAllocation.findAll({
      where: { studentProfileId: id, isActive: true },
      transaction,
    });
    await SeatAllocation.update(
      { isActive: false },
      { where: { studentProfileId: id, isActive: true }, transaction },
    );
    for (const seatId of new Set(allocations.map((a) => a.seatId))) {
      const count = await SeatAllocation.count({
        where: { seatId, isActive: true },
        transaction,
      });
      if (!count)
        await Seat.update(
          { status: 'AVAILABLE' as any },
          { where: { id: seatId, status: 'OCCUPIED' }, transaction },
        );
    }
    await profile.destroy({ transaction });
    await WorkspaceMembership.update(
      { status: 'INACTIVE' },
      {
        where: { userId, workspaceId: profile.workspaceId, role: 'STUDENT' },
        transaction,
      },
    );
    return { success: true };
  }
  async clearDues(
    id: string,
    amount: number,
    method: string,
    transaction?: Transaction,
  ): Promise<any> {
    if (!transaction)
      return sequelize.transaction((t) =>
        this.clearDues(id, amount, method, t),
      );
    const profile = await StudentProfile.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!profile) throw new NotFoundException('Student profile not found');
    amount = money(amount);
    if (!['CASH', 'UPI'].includes(method))
      throw new BadRequestException(
        'Dues collection requires cash or manually confirmed UPI',
      );
    if (!Number.isFinite(amount) || amount <= 0)
      throw new BadRequestException('Amount must be greater than zero');
    if (amount > (profile.dueAmount || 0))
      throw new BadRequestException('Amount exceeds due balance');
    await Payment.create(
      {
        workspaceId: profile.workspaceId,
        branchId: profile.branchId,
        studentProfileId: profile.id,
        amount,
        method,
        status: 'PAID',
        paidAt: new Date(),
        transactionId: `DUES-CLR-${Date.now()}`,
      } as any,
      { transaction },
    );
    profile.dueAmount = (profile.dueAmount || 0) - amount;
    await profile.save({ transaction });
    return profile;
  }
}
