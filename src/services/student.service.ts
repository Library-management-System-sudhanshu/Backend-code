import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { User } from '../models/user.model';
import { StudentProfile, StudentStatus } from '../models/student-profile.model';
import { Branch } from '../models/branch.model';
import { SeatAllocation } from '../models/seat-allocation.model';
import { Seat } from '../models/seat.model';
import { Shift } from '../models/shift.model';
import { StudentSubscription } from '../models/student-subscription.model';
import { Payment } from '../models/payment.model';
import { SubscriptionPlan } from '../models/subscription-plan.model';
import { NotFoundException, BadRequestException } from '../middlewares/error.middleware';
import sequelize from '../config/database';

export class StudentService {
  async listStudents(workspaceId: string, query: any) {
    const { search, branchId, status, limit = 10, page = 1 } = query;
    const offset = (page - 1) * limit;

    const userWhere: any = { workspaceId };
    if (search) {
      userWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const profileWhere: any = {};
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
          )`)
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
          const daysNum = query.days ? parseInt(query.days as string, 10) : 7;
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + (Number.isInteger(daysNum) && daysNum > 0 ? daysNum : 7));
          targetDate.setHours(23, 59, 59, 999);
          allocationWhere.endDate = { [Op.between]: [today, targetDate] };
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
          include: [
            { model: Seat },
            { model: Shift },
          ]
        },
        {
          model: StudentSubscription,
          required: false,
          include: [{ all: true }]
        }
      ],
      limit: Number(limit),
      offset: Number(offset),
      order: [['createdAt', 'DESC']],
    });

    return {
      students: rows,
      total: count,
      page: Number(page),
      limit: Number(limit),
    };
  }

  async getStudentById(id: string) {
    const student = await StudentProfile.findByPk(id, {
      include: [
        { model: User, attributes: ['id', 'name', 'email', 'mobile', 'avatar'] },
        { model: Branch },
        { model: SeatAllocation, include: [{ all: true }] },
        { model: StudentSubscription, include: [{ all: true }] },
        { model: Payment },
      ],
    });
    if (!student) throw new NotFoundException('Student profile not found');
    return student;
  }

  async getStudentByUserId(userId: string) {
    const student = await StudentProfile.findOne({
      where: { userId },
      include: [
        { model: User, attributes: ['id', 'name', 'email', 'mobile', 'avatar'] },
        { model: Branch },
        { model: SeatAllocation, include: [{ all: true }] },
        { model: StudentSubscription, include: [{ all: true }] },
      ],
    });
    if (!student) throw new NotFoundException('Student profile not found');
    return student;
  }

  async registerStudent(data: any, isSelfRegistration = false) {
    if (data.mobile) {
      const existingMobileUser = await User.findOne({ where: { mobile: data.mobile } });
      if (existingMobileUser) {
        throw new BadRequestException('Mobile number is already registered');
      }
    }

    if (!data.email || !data.email.trim()) {
      data.email = `${data.mobile || Date.now()}@studyflow.com`;
    }
    const existingUser = await User.findOne({ where: { email: data.email } });
    if (existingUser) {
      if (existingUser.branchId && existingUser.branchId !== data.branchId) {
        const otherBranch = await Branch.findByPk(existingUser.branchId);
        const branchName = otherBranch ? otherBranch.name : 'another branch';
        throw new BadRequestException(`Email is already registered in another.`);
      } else {
        throw new BadRequestException('Email already in use');
      }
    }

    const hashedPassword = await bcrypt.hash(data.password || 'Student@123', 10);

    // Create User
    const user = await User.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      mobile: data.mobile,
      role: 'STUDENT',
      workspaceId: data.workspaceId,
      branchId: data.branchId,
      avatar: data.avatar || null,
    } as any);

    // Mock QR Code link
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${user.id}`;

    // Create StudentProfile
    const profile = await StudentProfile.create({
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
    } as any);

    // Create subscription and payment if plan is selected
    if (data.subscriptionPlanId) {
      const plan = await SubscriptionPlan.findByPk(data.subscriptionPlanId);
      if (plan) {
        const startDate = data.joiningDate ? new Date(data.joiningDate) : new Date();
        const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
        await StudentSubscription.create({
          workspaceId: data.workspaceId,
          studentProfileId: profile.id,
          subscriptionPlanId: data.subscriptionPlanId,
          startDate,
          endDate,
          status: 'ACTIVE',
        } as any);

        const amountPaid = data.amountPaid !== undefined ? Number(data.amountPaid) : plan.price;
        const dueAmount = Math.max(0, plan.price - amountPaid);
        if (dueAmount > 0) {
          await profile.update({ dueAmount });
        }

        await Payment.create({
          workspaceId: data.workspaceId,
          branchId: data.branchId,
          studentProfileId: profile.id,
          amount: amountPaid,
          method: 'CASH',
          status: dueAmount > 0 ? 'PARTIAL' : 'PAID',
          paidAt: data.joiningDate ? new Date(data.joiningDate) : new Date(),
          transactionId: `CASH-REG-${Date.now()}`,
          invoiceUrl: `https://studyflow-receipts.s3.amazonaws.com/invoice_${Date.now()}.pdf`,
          dueDate: new Date((data.joiningDate ? new Date(data.joiningDate).getTime() : Date.now()) + 7 * 24 * 60 * 60 * 1000),
        } as any);
      }
    } else if (data.shiftId) {
      const shift = await Shift.findByPk(data.shiftId);
      if (shift) {
        // Find or create a SubscriptionPlan corresponding to this shift
        let plan = await SubscriptionPlan.findOne({
          where: {
            name: `${shift.name} Plan`,
            workspaceId: data.workspaceId,
            price: shift.price,
          },
        });
        if (!plan) {
          plan = await SubscriptionPlan.create({
            name: `${shift.name} Plan`,
            workspaceId: data.workspaceId,
            price: shift.price,
            durationDays: 30, // Default to monthly
            isActive: true,
          } as any);
        }

        const startDate = data.joiningDate ? new Date(data.joiningDate) : new Date();
        const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
        await StudentSubscription.create({
          workspaceId: data.workspaceId,
          studentProfileId: profile.id,
          subscriptionPlanId: plan.id,
          startDate,
          endDate,
          status: 'ACTIVE',
        } as any);

        const amountPaid = data.amountPaid !== undefined ? Number(data.amountPaid) : shift.price;
        const dueAmount = Math.max(0, shift.price - amountPaid);
        if (dueAmount > 0) {
          await profile.update({ dueAmount });
        }

        await Payment.create({
          workspaceId: data.workspaceId,
          branchId: data.branchId,
          studentProfileId: profile.id,
          amount: amountPaid,
          method: 'CASH',
          status: dueAmount > 0 ? 'PARTIAL' : 'PAID',
          paidAt: new Date(),
          transactionId: `CASH-REG-SHIFT-${Date.now()}`,
          invoiceUrl: `https://studyflow-receipts.s3.amazonaws.com/invoice_${Date.now()}.pdf`,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        } as any);
      }
    }

    return { user, profile };
  }

  async updateStudent(id: string, data: any) {
    const profile = await StudentProfile.findByPk(id, { include: [User] });
    if (!profile) throw new NotFoundException('Student profile not found');

    const user = profile.user;

    if (data.mobile && data.mobile !== user.mobile) {
      const existingMobileUser = await User.findOne({ where: { mobile: data.mobile } });
      if (existingMobileUser) {
        throw new BadRequestException('Mobile number is already registered');
      }
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await User.findOne({ where: { email: data.email } });
      if (existingUser) {
        const targetBranchId = data.branchId || profile.branchId;
        if (existingUser.branchId && existingUser.branchId !== targetBranchId) {
          const otherBranch = await Branch.findByPk(existingUser.branchId);
          const branchName = otherBranch ? otherBranch.name : 'another branch';
          throw new BadRequestException(`Email is already registered in branch: ${branchName}`);
        } else {
          throw new BadRequestException('Email already in use');
        }
      }
    }

    const userUpdates: any = {
      name: data.name ?? user.name,
      mobile: data.mobile ?? user.mobile,
      avatar: data.avatar ?? user.avatar,
    };

    if (data.email) {
      userUpdates.email = data.email;
    }

    if (data.password) {
      userUpdates.password = await bcrypt.hash(data.password, 10);
    }

    await user.update(userUpdates);

    await profile.update({
      guardianName: data.guardianName ?? profile.guardianName,
      guardianMobile: data.guardianMobile ?? profile.guardianMobile,
      aadharNumber: data.aadharNumber ?? profile.aadharNumber,
      gender: data.gender ?? profile.gender,
      address: data.address ?? profile.address,
      branchId: data.branchId ?? profile.branchId,
      status: data.status ?? profile.status,
      joiningDate: data.joiningDate ?? profile.joiningDate,
    });

    return { user, profile };
  }

  async updateStatus(id: string, status: StudentStatus) {
    const profile = await StudentProfile.findByPk(id);
    if (!profile) throw new NotFoundException('Student profile not found');

    await profile.update({ status });
    return profile;
  }

  async deleteStudent(id: string) {
    const profile = await StudentProfile.findByPk(id);
    if (!profile) throw new NotFoundException('Student profile not found');

    const userId = profile.userId;
    await profile.destroy();
    await User.destroy({ where: { id: userId } });
    return { success: true };
  }

  async clearDues(id: string, amount: number, method: string) {
    const profile = await StudentProfile.findByPk(id);
    if (!profile) throw new NotFoundException('Student profile not found');

    if (amount <= 0) throw new BadRequestException('Amount must be greater than zero');
    if (amount > (profile.dueAmount || 0)) throw new BadRequestException('Amount exceeds due balance');

    await Payment.create({
      workspaceId: profile.workspaceId,
      branchId: profile.branchId,
      studentProfileId: profile.id,
      amount,
      method,
      status: 'PAID',
      paidAt: new Date(),
      transactionId: `DUES-CLR-${Date.now()}`,
    } as any);

    profile.dueAmount = (profile.dueAmount || 0) - amount;
    await profile.save();

    return profile;
  }
}
