import cron from 'node-cron';
import { Op } from 'sequelize';
import { Payment } from '../models/payment.model';
import { StudentSubscription } from '../models/student-subscription.model';
import { StudentProfile } from '../models/student-profile.model';
import { User } from '../models/user.model';
import { WorkspaceSubscription } from '../models/workspace-subscription.model';
import { SeatAllocation } from '../models/seat-allocation.model';
import { WhatsAppService } from './whatsapp.service';

const whatsappService = new WhatsAppService();

export class CronService {
  static init() {
    // Run every day at 09:00 AM server time
    cron.schedule('0 9 * * *', async () => {
      console.log('[CronService] Running daily tasks...');
      try {
        await this.sendFeeReminders();
        await this.sendRenewalReminders();
        await this.expireSaaSTrials();
      } catch (error) {
        console.error('[CronService] Error running daily tasks:', error);
      }
    });
    console.log('[CronService] Daily WhatsApp reminders scheduled (09:00 AM).');
  }

  static async sendFeeReminders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);

    const endOfTwoDaysFromNow = new Date(twoDaysFromNow);
    endOfTwoDaysFromNow.setHours(23, 59, 59, 999);

    const payments = await Payment.findAll({
      where: {
        status: 'UNPAID',
        dueDate: {
          [Op.between]: [today, endOfTwoDaysFromNow],
        },
      },
      include: [
        {
          model: StudentProfile,
          include: [{ model: User }],
        },
      ],
    });

    let sentCount = 0;
    for (const payment of payments) {
      if (!payment.studentProfile || !payment.studentProfile.user) continue;

      const workspaceId = payment.studentProfile.user.workspaceId;
      const amount = payment.amount.toString();
      const dueDate = payment.dueDate ? payment.dueDate.toISOString().split('T')[0] : 'soon';

      await whatsappService.sendMessage(workspaceId, payment.studentProfileId, {
        templateId: 'fee_reminder',
        customVariables: {
          amount: amount,
          dueDate: dueDate,
        },
      });
      sentCount++;
    }
    console.log(`[CronService] Sent ${sentCount} fee reminders.`);
  }

  static async sendRenewalReminders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const endOfThreeDaysFromNow = new Date(threeDaysFromNow);
    endOfThreeDaysFromNow.setHours(23, 59, 59, 999);

    const subscriptions = await StudentSubscription.findAll({
      where: {
        status: 'ACTIVE',
        endDate: {
          [Op.between]: [today, endOfThreeDaysFromNow],
        },
      },
      include: [
        {
          model: StudentProfile,
          include: [{ model: User }],
        },
      ],
    });

    let sentCount = 0;
    for (const sub of subscriptions) {
      if (!sub.studentProfile || !sub.studentProfile.user) continue;

      // Find the seat number for the student
      const allocation = await SeatAllocation.findOne({
        where: { studentProfileId: sub.studentProfileId, isActive: true },
        include: ['seat'],
      });
      
      const seatNumber = allocation && allocation.seat ? allocation.seat.number : 'your seat';
      const workspaceId = sub.studentProfile.user.workspaceId;
      const endDate = sub.endDate ? sub.endDate.toISOString().split('T')[0] : 'soon';

      await whatsappService.sendMessage(workspaceId, sub.studentProfileId, {
        templateId: 'renewal_reminder',
        customVariables: {
          endDate: endDate,
          seatNumber: seatNumber,
        },
      });
      sentCount++;
    }
    console.log(`[CronService] Sent ${sentCount} renewal reminders.`);
  }
  static async expireSaaSTrials() {
    const today = new Date();
    
    // Find all TRIAL subscriptions where trialEndDate is <= now
    const expiredTrials = await WorkspaceSubscription.findAll({
      where: {
        status: 'TRIAL',
        trialEndDate: {
          [Op.lte]: today,
        },
      },
    });

    let count = 0;
    for (const trial of expiredTrials) {
      await trial.update({ status: 'EXPIRED' });
      count++;
    }
    
    if (count > 0) {
      console.log(`[CronService] Expired ${count} SaaS trials.`);
    }
  }
}
