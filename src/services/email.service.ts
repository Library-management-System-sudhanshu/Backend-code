import { Resend } from 'resend';
import { Op } from 'sequelize';
import { BroadcastLog } from '../models/broadcast-log.model';
import { StudentProfile } from '../models/student-profile.model';
import { User } from '../models/user.model';
import { SeatAllocation } from '../models/seat-allocation.model';
import { StudentSubscription } from '../models/student-subscription.model';
import { BadRequestException } from '../middlewares/error.middleware';

export class EmailService {
  private resend: Resend | null = null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
      console.log('[Email Service] Resend client initialized.');
    } else {
      console.log('[Email Service] RESEND_API_KEY not set. Email dispatch will use simulator mode.');
    }
  }

  async sendBroadcast(workspaceId: string, data: any) {
    const { subject, message, fromEmail, filters, studentIds } = data;
    const { branchId, shiftId, status } = filters || {};

    const profileWhere: any = { status: 'APPROVED' };
    if (branchId) profileWhere.branchId = branchId;
    if (studentIds && studentIds.length > 0) {
      profileWhere.id = studentIds;
    }

    const includeList: any[] = [
      {
        model: User,
        where: { workspaceId },
        required: true,
      },
    ];

    if (shiftId) {
      includeList.push({
        model: SeatAllocation,
        where: { shiftId, isActive: true },
        required: true,
      });
    }

    includeList.push({ model: StudentSubscription, required: false });
    includeList.push({ model: SeatAllocation, required: false });

    let students = await StudentProfile.findAll({
      where: profileWhere,
      include: includeList,
    });

    // Filter in-memory by status if provided
    if (status && status !== 'ALL') {
      students = students.filter((student) => {
        if (status === 'ACTIVE') {
          return student.subscriptions && student.subscriptions.some((s) => s.status === 'ACTIVE');
        }
        if (status === 'EXPIRED') {
          const hasActive = student.subscriptions && student.subscriptions.some((s) => s.status === 'ACTIVE');
          const hasExpired = student.subscriptions && student.subscriptions.some((s) => s.status === 'EXPIRED');
          return !hasActive && hasExpired;
        }
        if (status === 'EXPIRING_SOON') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const sevenDaysLater = new Date(today);
          sevenDaysLater.setDate(today.getDate() + 7);
          return (
            student.subscriptions &&
            student.subscriptions.some((s) => {
              if (s.status !== 'ACTIVE') return false;
              const endDate = new Date(s.endDate);
              return endDate >= today && endDate <= sevenDaysLater;
            })
          );
        }
        if (status === 'NO_SEAT') {
          const hasActiveSeat = student.allocations && student.allocations.some((a) => a.isActive);
          return !hasActiveSeat;
        }
        return true;
      });
    }

    if (!students || students.length === 0) {
      throw new BadRequestException('No approved students found matching the selected target filters.');
    }

    const senderEmail = fromEmail || 'StudyFlow Notifications <no-reply@trishulindustries.online>';

    const logs: any[] = [];
    for (const student of students) {
      const recipientEmail = student.user.email;
      if (!recipientEmail) continue;

      // Replace template variables
      let finalMessage = message;
      finalMessage = finalMessage.replace(/\{\{studentName\}\}/g, student.user.name || 'Student');
      finalMessage = finalMessage.replace(/\{\{branchName\}\}/g, (student as any).branch?.name || '');

      let finalSubject = subject || 'StudyFlow Notification';
      finalSubject = finalSubject.replace(/\{\{studentName\}\}/g, student.user.name || 'Student');

      const isSent = await this.dispatchEmail(senderEmail, recipientEmail, finalSubject, finalMessage);

      const log = await BroadcastLog.create({
        workspaceId,
        channel: 'EMAIL',
        recipient: recipientEmail,
        subject: finalSubject,
        message: finalMessage,
        status: isSent ? 'SENT' : 'FAILED',
      } as any);

      logs.push(log);
    }

    const sentCount = logs.filter((l) => l.status === 'SENT').length;
    const failedCount = logs.filter((l) => l.status === 'FAILED').length;

    if (sentCount === 0 && failedCount > 0) {
      throw new BadRequestException(`Failed to send email broadcast. All ${failedCount} email(s) failed via Resend API.`);
    }

    return {
      sentCount,
      failedCount,
      logs,
    };
  }

  async getLogs(workspaceId: string) {
    return BroadcastLog.findAll({
      where: { workspaceId, channel: 'EMAIL' },
      order: [['sentAt', 'DESC']],
    });
  }

  async getStats(workspaceId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const whereBase: any = { channel: 'EMAIL', status: 'SENT' };
    if (workspaceId) {
      whereBase.workspaceId = workspaceId;
    }

    const dailyCount = await BroadcastLog.count({
      where: {
        ...whereBase,
        sentAt: { [Op.gte]: startOfToday },
      },
    });

    const monthlyCount = await BroadcastLog.count({
      where: {
        ...whereBase,
        sentAt: { [Op.gte]: startOfMonth },
      },
    });

    const totalCount = await BroadcastLog.count({
      where: whereBase,
    });

    const dailyLimit = 100;
    const monthlyLimit = 3000;

    return {
      dailyCount,
      dailyLimit,
      dailyRemaining: Math.max(0, dailyLimit - dailyCount),
      monthlyCount,
      monthlyLimit,
      monthlyRemaining: Math.max(0, monthlyLimit - monthlyCount),
      totalCount,
    };
  }

  // Resend Domain API Methods for trishulindustries.online
  async getDomainInfo(domainName: string = 'trishulindustries.online') {
    if (!this.resend) {
      return { success: false, message: 'Resend API key is not configured.' };
    }

    try {
      const listRes = await this.resend.domains.list();
      const existing = listRes.data?.data?.find((d: any) => d.name === domainName);

      if (existing) {
        const detail = await this.resend.domains.get(existing.id);
        return { success: true, domain: detail.data || existing };
      }

      // Create domain if not exists
      const created = await this.resend.domains.create({ name: domainName });
      return { success: true, domain: created.data, created: true };
    } catch (error: any) {
      console.error('[Email Service] Domain info error:', error);
      return { success: false, error: error.message || error };
    }
  }

  async verifyDomain(domainId: string) {
    if (!this.resend) {
      return { success: false, message: 'Resend API key is not configured.' };
    }

    try {
      const result = await this.resend.domains.verify(domainId);
      return { success: true, result: result.data || result };
    } catch (error: any) {
      console.error('[Email Service] Domain verify error:', error);
      return { success: false, error: error.message || error };
    }
  }

  async updateDomain(domainId: string, openTracking = false, clickTracking = true) {
    if (!this.resend) {
      return { success: false, message: 'Resend API key is not configured.' };
    }

    try {
      const result = await this.resend.domains.update({
        id: domainId,
        openTracking,
        clickTracking,
      });
      return { success: true, result: result.data || result };
    } catch (error: any) {
      console.error('[Email Service] Domain update error:', error);
      return { success: false, error: error.message || error };
    }
  }

  private async dispatchEmail(
    from: string,
    to: string,
    subject: string,
    htmlBody: string,
  ): Promise<boolean> {
    if (!this.resend) {
      console.log(`[Email Simulator] From: ${from} | To: ${to} | Subject: "${subject}" | Body: "${htmlBody.substring(0, 80)}..."`);
      return true;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from,
        to: [to],
        subject,
        html: htmlBody,
      });

      if (error) {
        console.error('[Email Service Error] Resend API error:', error);
        return false;
      }

      console.log(`[Email Service Success] Email sent to ${to}. ID: ${data?.id}`);
      return true;
    } catch (error) {
      console.error('[Email Service Error] Failed to send email:', error);
      return false;
    }
  }
}
