import { Payment, PaymentMethod, PaymentStatus } from '../models/payment.model';
import { StudentProfile } from '../models/student-profile.model';
import { StudentSubscription, SubscriptionStatus } from '../models/student-subscription.model';
import { SubscriptionPlan } from '../models/subscription-plan.model';
import { User } from '../models/user.model';
import { Op } from 'sequelize';
import { NotFoundException } from '../middlewares/error.middleware';

export class PaymentService {
  async createPayment(data: any) {
    const { studentProfileId, amount, method, subscriptionPlanId } = data;

    const student = await StudentProfile.findByPk(studentProfileId);
    if (!student) throw new NotFoundException('Student profile not found');

    const payment = await Payment.create({
      studentProfileId,
      amount,
      method,
      status: method === 'CASH' ? PaymentStatus.PAID : PaymentStatus.UNPAID, // Cash payments are direct
      paidAt: method === 'CASH' ? new Date() : null,
      transactionId: method === 'CASH' ? `CASH-${Date.now()}` : null,
      invoiceUrl: `https://studyflow-receipts.s3.amazonaws.com/invoice_${Date.now()}.pdf`,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days due
    } as any);

    // If it's a cash payment, directly activate the subscription
    if (method === 'CASH' && subscriptionPlanId) {
      await this.activateSubscription(studentProfileId, subscriptionPlanId);
    }

    // Razorpay Integration Mock
    if (method === 'RAZORPAY') {
      return {
        payment,
        razorpayOrder: {
          id: `order_${Math.random().toString(36).substring(2, 11)}`,
          amount: amount * 100, // in paisa
          currency: 'INR',
        },
      };
    }

    return { payment };
  }

  async verifyRazorpay(paymentId: string, transactionId: string) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new NotFoundException('Payment record not found');

    await payment.update({
      status: PaymentStatus.PAID,
      transactionId,
      paidAt: new Date(),
      receiptUrl: `https://studyflow-receipts.s3.amazonaws.com/receipt_${payment.id}.pdf`,
    });

    return payment;
  }

  async recordManualPayment(paymentId: string, method: PaymentMethod) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new NotFoundException('Payment record not found');

    await payment.update({
      status: PaymentStatus.PAID,
      method,
      transactionId: `${method}-${Date.now()}`,
      paidAt: new Date(),
      receiptUrl: `https://studyflow-receipts.s3.amazonaws.com/receipt_${payment.id}.pdf`,
    });

    return payment;
  }

  private async activateSubscription(studentProfileId: string, planId: string) {
    const plan = await SubscriptionPlan.findByPk(planId);
    if (!plan) return;

    // Check if there is an active subscription
    const activeSub = await StudentSubscription.findOne({
      where: { studentProfileId, status: SubscriptionStatus.ACTIVE },
      order: [['endDate', 'DESC']],
    });

    let startDate = new Date();
    if (activeSub && activeSub.endDate > startDate) {
      startDate = activeSub.endDate; // Queue plan to start after current one ends
    }

    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    await StudentSubscription.create({
      studentProfileId,
      subscriptionPlanId: planId,
      startDate,
      endDate,
      status: SubscriptionStatus.ACTIVE,
    } as any);
  }

  async getPayments(workspaceId: string, query: any) {
    const { studentProfileId } = query;
    const whereClause: any = {};

    if (studentProfileId) {
      whereClause.studentProfileId = studentProfileId;
    }

    return Payment.findAll({
      where: whereClause,
      include: [
        {
          model: StudentProfile,
          required: true,
          include: [{ model: User, where: { workspaceId } }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async getCollectionReport(workspaceId: string, range: string) {
    const today = new Date();
    let startDate = new Date(today.getFullYear(), today.getMonth(), 1); // Start of month

    if (range === 'daily') {
      startDate = new Date(today.setHours(0, 0, 0, 0));
    }

    const payments = await Payment.findAll({
      where: {
        status: PaymentStatus.PAID,
        paidAt: { [Op.gte]: startDate },
      },
      include: [
        {
          model: StudentProfile,
          required: true,
          include: [{ model: User, where: { workspaceId } }],
        },
      ],
    });

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      range,
      totalCollected,
      count: payments.length,
      payments,
    };
  }
}
