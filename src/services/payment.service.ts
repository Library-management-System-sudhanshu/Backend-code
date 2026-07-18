import { Payment, PaymentMethod, PaymentStatus } from '../models/payment.model';
import { StudentProfile } from '../models/student-profile.model';
import { StudentSubscription, SubscriptionStatus } from '../models/student-subscription.model';
import { SubscriptionPlan } from '../models/subscription-plan.model';
import { User } from '../models/user.model';
import { Shift } from '../models/shift.model';
import { Op } from 'sequelize';
import { NotFoundException } from '../middlewares/error.middleware';
import crypto from 'crypto';

export class PaymentService {
  async createPayment(data: any) {
    const { studentProfileId, amount, method, subscriptionPlanId, shiftId, totalAmount } = data;

    const student = await StudentProfile.findByPk(studentProfileId);
    if (!student) throw new NotFoundException('Student profile not found');

    let targetPlanId = subscriptionPlanId;
    let finalTotalAmount = totalAmount !== undefined ? Number(totalAmount) : amount;

    if (shiftId) {
      const shift = await Shift.findByPk(shiftId);
      if (shift) {
        const user = await User.findByPk(student.userId);
        if (user) {
          const durationMonths = data.durationMonths ? Number(data.durationMonths) : 1;
          const durationDays = durationMonths * 30;
          
          let planName = `${shift.name} Plan`;
          let expectedPrice = shift.price || 0;
          if (durationMonths === 3) {
            planName = `${shift.name} 3-Month Plan`;
            expectedPrice = shift.price3Months || (shift.price * 3);
          } else if (durationMonths === 6) {
            planName = `${shift.name} 6-Month Plan`;
            expectedPrice = shift.price6Months || (shift.price * 6);
          } else if (durationMonths !== 1) {
            planName = `${shift.name} Plan - ${durationMonths} Months`;
            expectedPrice = shift.price * durationMonths;
          }

          let plan = await SubscriptionPlan.findOne({
            where: {
              name: planName,
              workspaceId: user.workspaceId,
              durationDays,
            },
          });
          if (!plan) {
            plan = await SubscriptionPlan.create({
              name: planName,
              workspaceId: user.workspaceId,
              price: expectedPrice,
              durationDays,
              isActive: true,
            } as any);
          } else {
            if (plan.price !== expectedPrice) {
              await plan.update({ price: expectedPrice });
            }
          }
          targetPlanId = plan.id;
          finalTotalAmount = expectedPrice;
        }
      }
    } else if (subscriptionPlanId) {
      const plan = await SubscriptionPlan.findByPk(subscriptionPlanId);
      if (plan) {
        finalTotalAmount = plan.price;
      }
    }

    const dueAmount = Math.max(0, finalTotalAmount - amount);
    if (dueAmount > 0) {
      student.dueAmount = Number(student.dueAmount || 0) + dueAmount;
      await student.save();
    }

    const payment = await Payment.create({
      workspaceId: student.workspaceId,
      branchId: student.branchId,
      studentProfileId,
      amount,
      method,
      subscriptionPlanId: targetPlanId || null,
      status: method === 'CASH'
        ? (dueAmount > 0 ? PaymentStatus.PARTIAL : PaymentStatus.PAID)
        : PaymentStatus.UNPAID, // Cash payments are direct
      paidAt: method === 'CASH' ? new Date() : null,
      transactionId: method === 'CASH' ? `CASH-${Date.now()}` : null,
      invoiceUrl: `https://studyflow-receipts.s3.amazonaws.com/invoice_${Date.now()}.pdf`,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days due
    } as any);

    // If it's a cash payment, directly activate the subscription
    if (method === 'CASH' && targetPlanId) {
      await this.activateSubscription(studentProfileId, targetPlanId);
    }

    // Razorpay Integration
    if (method === 'RAZORPAY') {
      try {
        const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_T9hh97PsK4bGuG';
        const keySecret = process.env.RAZORPAY_KEY_SECRET || 'aL02SqOqMzSQP7XwCZm9fnfo';
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          body: JSON.stringify({
            amount: Math.round(amount * 100), // in paise
            currency: 'INR',
            receipt: payment.id
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          console.error('[Razorpay Order Creation Error]:', errData);
          throw new Error('Failed to create Razorpay order');
        }

        const razorpayOrder = await response.json() as any;

        await payment.update({ transactionId: razorpayOrder.id });

        return {
          payment,
          razorpayOrder: {
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
          },
        };
      } catch (err: any) {
        console.error('[Payment Service Error] Razorpay creation failed, falling back to mock:', err);
        return {
          payment,
          razorpayOrder: {
            id: `order_${Math.random().toString(36).substring(2, 11)}`,
            amount: amount * 100, // in paisa
            currency: 'INR',
          },
        };
      }
    }

    return { payment };
  }

  async verifyRazorpay(paymentId: string, transactionId: string, body?: any) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new NotFoundException('Payment record not found');

    if (body?.razorpay_signature && body?.razorpay_order_id) {
      const keySecret = process.env.RAZORPAY_KEY_SECRET || 'aL02SqOqMzSQP7XwCZm9fnfo';
      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(`${body.razorpay_order_id}|${transactionId}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== body.razorpay_signature) {
        throw new Error('Invalid Razorpay signature');
      }
    }

    let isPartial = false;
    if (payment.subscriptionPlanId) {
      const plan = await SubscriptionPlan.findByPk(payment.subscriptionPlanId);
      if (plan && Number(payment.amount) < Number(plan.price)) {
        isPartial = true;
      }
    }

    await payment.update({
      status: isPartial ? PaymentStatus.PARTIAL : PaymentStatus.PAID,
      transactionId,
      paidAt: new Date(),
      receiptUrl: `https://studyflow-receipts.s3.amazonaws.com/receipt_${payment.id}.pdf`,
    });

    if (payment.subscriptionPlanId) {
      await this.activateSubscription(payment.studentProfileId, payment.subscriptionPlanId);
    }

    return payment;
  }

  async recordManualPayment(paymentId: string, method: PaymentMethod) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) throw new NotFoundException('Payment record not found');

    let isPartial = false;
    if (payment.subscriptionPlanId) {
      const plan = await SubscriptionPlan.findByPk(payment.subscriptionPlanId);
      if (plan && Number(payment.amount) < Number(plan.price)) {
        isPartial = true;
      }
    }

    await payment.update({
      status: isPartial ? PaymentStatus.PARTIAL : PaymentStatus.PAID,
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

    const student = await StudentProfile.findByPk(studentProfileId);
    if (!student) return;

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
      workspaceId: student.workspaceId,
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
      attributes: [
        'id',
        'amount',
        'status',
        'method',
        'transactionId',
        'invoiceUrl',
        'receiptUrl',
        'dueDate',
        'paidAt',
        'createdAt'
      ],
      include: [
        {
          model: StudentProfile,
          required: true,
          attributes: ['id'],
          include: [
            {
              model: User,
              where: { workspaceId },
              attributes: ['id', 'name', 'email']
            }
          ],
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
      attributes: [
        'id',
        'amount',
        'status',
        'method',
        'transactionId',
        'invoiceUrl',
        'receiptUrl',
        'dueDate',
        'paidAt',
        'createdAt'
      ],
      include: [
        {
          model: StudentProfile,
          required: true,
          attributes: ['id'],
          include: [
            {
              model: User,
              where: { workspaceId },
              attributes: ['id', 'name', 'email']
            }
          ],
        },
      ],
    });

    const totalCollected = payments.reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

    return {
      range,
      totalCollected,
      count: payments.length,
      payments,
    };
  }
}
