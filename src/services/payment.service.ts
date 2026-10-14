import { Payment, PaymentMethod, PaymentStatus } from '../models/payment.model';
import { StudentProfile } from '../models/student-profile.model';
import {
  StudentSubscription,
  SubscriptionStatus,
} from '../models/student-subscription.model';
import { SubscriptionPlan } from '../models/subscription-plan.model';
import { User } from '../models/user.model';
import { Shift } from '../models/shift.model';
import { Op, Transaction } from 'sequelize';
import {
  BadRequestException,
  NotFoundException,
} from '../middlewares/error.middleware';
import { createOrder, money, verifyCapturedPayment } from './razorpay';
import sequelize from '../config/database';
import crypto from 'node:crypto';

export class PaymentService {
  async createPayment(data: any, allowPartial = false) {
    const amount = money(data.amount);
    if (!Object.values(PaymentMethod).includes(data.method))
      throw new BadRequestException('Invalid payment method');
    const student = await StudentProfile.findByPk(data.studentProfileId);
    if (!student) throw new NotFoundException('Student profile not found');
    let plan: SubscriptionPlan | null = null;
    if (data.subscriptionPlanId) {
      plan = await SubscriptionPlan.findOne({
        where: {
          id: data.subscriptionPlanId,
          workspaceId: student.workspaceId,
          isActive: true,
        },
      });
      if (!plan) throw new BadRequestException('Invalid subscription plan');
    } else if (data.shiftId) {
      const shift = await Shift.findOne({
        where: { id: data.shiftId, workspaceId: student.workspaceId },
      });
      if (!shift) throw new BadRequestException('Invalid shift');
      const months = Number(data.durationMonths ?? 1);
      if (!Number.isInteger(months) || months < 1 || months > 24)
        throw new BadRequestException('Invalid duration');
      const price =
        months === 3
          ? (shift.price3Months ?? Number(shift.price) * 3)
          : months === 6
            ? (shift.price6Months ?? Number(shift.price) * 6)
            : Number(shift.price) * months;
      // Include price in the generated name so a new price never mutates historical terms.
      const name = `${shift.name} ${months}-Month Plan (${money(price)} INR)`;
      [plan] = await SubscriptionPlan.findOrCreate({
        where: { workspaceId: student.workspaceId, name },
        defaults: {
          workspaceId: student.workspaceId,
          name,
          price,
          durationDays: months * 30,
          isActive: true,
        } as any,
      });
    }
    const totalAmount = money(
      plan ? plan.price : (data.totalAmount ?? amount),
      'Total amount',
    );
    const discountAmount = money(data.discountAmount ?? 0, 'Discount', true);
    if (
      discountAmount > totalAmount ||
      amount > totalAmount - discountAmount + 0.00001
    ) {
      throw new BadRequestException(
        'Payment and discount exceed the total amount',
      );
    }
    if (
      !allowPartial &&
      Math.round(amount * 100) !==
        Math.round((totalAmount - discountAmount) * 100)
    ) {
      throw new BadRequestException(
        'Student online payments must cover the full plan amount',
      );
    }
    const payment = await sequelize.transaction(async (transaction) => {
      const row = await Payment.create(
        {
          workspaceId: student.workspaceId,
          branchId: student.branchId,
          studentProfileId: student.id,
          amount,
          totalAmount,
          discountAmount,
          method: data.method,
          subscriptionPlanId: plan?.id ?? null,
          status: PaymentStatus.UNPAID,
          dueDate: new Date(Date.now() + 7 * 86400000),
        } as any,
        { transaction },
      );
      if (data.method === PaymentMethod.CASH)
        await this.settle(row, `CASH-${crypto.randomUUID()}`, transaction);
      return row;
    });
    if (data.method === PaymentMethod.RAZORPAY) {
      // Failed provider calls leave a pending record; they never return a fabricated order or grant access.
      const order = await createOrder(amount, payment.id);
      await payment.update({ orderId: order.id, transactionId: order.id });
      return {
        payment,
        razorpayOrder: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
        },
      };
    }
    return { payment };
  }

  async verifyRazorpay(
    paymentId: string,
    transactionId: string,
    body: any = {},
  ) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new NotFoundException('Payment record not found');
    const providerId = body.razorpay_payment_id || transactionId;
    if (
      transactionId &&
      body.razorpay_payment_id &&
      transactionId !== body.razorpay_payment_id
    ) {
      throw new BadRequestException('Conflicting payment IDs');
    }
    if (
      payment.method !== PaymentMethod.RAZORPAY ||
      !payment.orderId ||
      body.razorpay_order_id !== payment.orderId
    ) {
      throw new BadRequestException('Payment order does not match this record');
    }
    await verifyCapturedPayment(
      payment.orderId,
      providerId,
      body.razorpay_signature,
      Number(payment.amount),
    );
    return sequelize.transaction(async (transaction) => {
      const locked = await Payment.findByPk(paymentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!locked || locked.orderId !== payment.orderId)
        throw new BadRequestException('Payment changed; retry verification');
      if (locked.status === PaymentStatus.REFUNDED)
        throw new BadRequestException('Payment has been refunded');
      if (locked.paidAt) {
        if (locked.transactionId !== providerId)
          throw new BadRequestException(
            'Payment already settled with another transaction',
          );
        return locked;
      }
      await this.settle(locked, providerId, transaction);
      return locked;
    });
  }

  async recordManualPayment(paymentId: string, method: PaymentMethod) {
    if (![PaymentMethod.CASH, PaymentMethod.UPI].includes(method))
      throw new BadRequestException(
        'Only cash or UPI can be recorded manually',
      );
    return sequelize.transaction(async (transaction) => {
      const payment = await Payment.findByPk(paymentId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!payment) throw new NotFoundException('Payment record not found');
      if (payment.method === PaymentMethod.RAZORPAY)
        throw new BadRequestException(
          'Razorpay payments require provider verification',
        );
      if (payment.status === PaymentStatus.REFUNDED)
        throw new BadRequestException('Payment has been refunded');
      if (payment.paidAt) return payment;
      payment.method = method;
      await this.settle(
        payment,
        `${method}-${crypto.randomUUID()}`,
        transaction,
      );
      return payment;
    });
  }

  private async settle(
    payment: Payment,
    transactionId: string,
    transaction: Transaction,
  ) {
    const student = await StudentProfile.findByPk(payment.studentProfileId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!student || student.workspaceId !== payment.workspaceId)
      throw new BadRequestException('Invalid student payment relationship');
    let plan: SubscriptionPlan | null = null;
    if (payment.subscriptionPlanId) {
      plan = await SubscriptionPlan.findOne({
        where: {
          id: payment.subscriptionPlanId,
          workspaceId: payment.workspaceId,
        },
        transaction,
      });
      if (!plan) throw new BadRequestException('Subscription plan unavailable');
    }
    const total = Number(payment.totalAmount ?? plan?.price ?? payment.amount);
    const due = Math.max(
      0,
      Math.round(
        (total - Number(payment.discountAmount ?? 0) - Number(payment.amount)) *
          100,
      ) / 100,
    );
    // Legacy pending records already adjusted the profile balance at creation.
    if (payment.totalAmount != null && due > 0) {
      await student.update(
        { dueAmount: Number(student.dueAmount || 0) + due },
        { transaction },
      );
    }
    let subscriptionId = payment.studentSubscriptionId;
    if (plan && !subscriptionId) {
      const active = await StudentSubscription.findOne({
        where: {
          studentProfileId: student.id,
          status: SubscriptionStatus.ACTIVE,
        },
        order: [['endDate', 'DESC']],
        transaction,
      });
      const now = new Date();
      const startDate = active && active.endDate > now ? active.endDate : now;
      const sub = await StudentSubscription.create(
        {
          workspaceId: student.workspaceId,
          studentProfileId: student.id,
          subscriptionPlanId: plan.id,
          startDate,
          endDate: new Date(startDate.getTime() + plan.durationDays * 86400000),
          status: SubscriptionStatus.ACTIVE,
        } as any,
        { transaction },
      );
      subscriptionId = sub.id;
    }
    await payment.update(
      {
        status: due > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PAID,
        transactionId,
        paidAt: new Date(),
        studentSubscriptionId: subscriptionId,
        method: payment.method,
      },
      { transaction },
    );
  }

  async getPayments(workspaceId: string, query: any) {
    return Payment.findAll({
      where: {
        workspaceId,
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.studentProfileId
          ? { studentProfileId: query.studentProfileId }
          : {}),
      },
      include: [
        {
          model: StudentProfile,
          required: false,
          attributes: ['id'],
          include: [{ model: User, attributes: ['id', 'name', 'email'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async getCollectionReport(
    workspaceId: string,
    range: string,
    branchId?: string,
  ) {
    const today = new Date();
    const startDate =
      range === 'daily'
        ? new Date(new Date().setHours(0, 0, 0, 0))
        : new Date(today.getFullYear(), today.getMonth(), 1);
    const payments = await Payment.findAll({
      where: {
        workspaceId,
        ...(branchId ? { branchId } : {}),
        status: { [Op.in]: [PaymentStatus.PAID, PaymentStatus.PARTIAL] },
        paidAt: { [Op.gte]: startDate },
      },
      include: [
        {
          model: StudentProfile,
          required: false,
          attributes: ['id'],
          include: [{ model: User, attributes: ['id', 'name', 'email'] }],
        },
      ],
    });
    return {
      range,
      totalCollected: payments.reduce((sum, p) => sum + Number(p.amount), 0),
      count: payments.length,
      payments,
    };
  }
}
