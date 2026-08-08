import { Resend } from 'resend';
import { BroadcastLog } from '../models/broadcast-log.model';
import { StudentProfile } from '../models/student-profile.model';
import { User } from '../models/user.model';
import { SeatAllocation } from '../models/seat-allocation.model';
import { StudentSubscription } from '../models/student-subscription.model';

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

    const senderEmail = fromEmail || 'onboarding@resend.dev';

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

    return {
      sentCount: logs.filter((l) => l.status === 'SENT').length,
      failedCount: logs.filter((l) => l.status === 'FAILED').length,
      logs,
    };
  }

  async getLogs(workspaceId: string) {
    return BroadcastLog.findAll({
      where: { workspaceId, channel: 'EMAIL' },
      order: [['sentAt', 'DESC']],
    });
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
