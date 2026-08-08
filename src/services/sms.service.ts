import { BroadcastLog } from '../models/broadcast-log.model';
import { StudentProfile } from '../models/student-profile.model';
import { User } from '../models/user.model';
import { SeatAllocation } from '../models/seat-allocation.model';
import { StudentSubscription } from '../models/student-subscription.model';

export class SmsService {
  async sendBroadcast(workspaceId: string, data: any) {
    const { message, filters, studentIds } = data;
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

    const logs: any[] = [];
    for (const student of students) {
      const recipient = student.user.mobile || 'Unknown';
      if (!recipient || recipient === 'Unknown') continue;

      // Replace template variables in message
      let finalMessage = message;
      finalMessage = finalMessage.replace(/\{\{studentName\}\}/g, student.user.name || 'Student');
      finalMessage = finalMessage.replace(/\{\{branchName\}\}/g, (student as any).branch?.name || '');

      const isSent = await this.dispatchSms(recipient, finalMessage);

      const log = await BroadcastLog.create({
        workspaceId,
        channel: 'SMS',
        recipient,
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
      where: { workspaceId, channel: 'SMS' },
      order: [['sentAt', 'DESC']],
    });
  }

  private async dispatchSms(recipient: string, message: string): Promise<boolean> {
    // Simulator — logs to console. Wire to Twilio/MSG91 later.
    const sanitized = recipient.replace(/\D/g, '');
    if (!sanitized) {
      console.error('[SMS Service Error] Recipient number contains no digits:', recipient);
      return false;
    }

    console.log(`[SMS Simulator] Sending SMS to ${sanitized}: "${message.substring(0, 80)}..."`);
    return true;
  }
}
