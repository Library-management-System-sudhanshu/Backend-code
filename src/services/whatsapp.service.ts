import { WhatsAppLog } from '../models/whatsapp-log.model';
import { StudentProfile } from '../models/student-profile.model';
import { User } from '../models/user.model';
import { SeatAllocation } from '../models/seat-allocation.model';

export class WhatsAppService {
  async getTemplates() {
    return [
      {
        id: 'fee_reminder',
        name: 'Fee Due Reminder',
        text: 'Dear {{studentName}}, your fee of {{amount}} is outstanding. Please pay by {{dueDate}} to avoid seat suspension. Team StudyFlow.',
      },
      {
        id: 'renewal_reminder',
        name: 'Plan Renewal Alert',
        text: 'Hello {{studentName}}, your study hall subscription expires on {{endDate}}. Renew your plan today to retain seat {{seatNumber}}. Team StudyFlow.',
      },
      {
        id: 'holiday_notice',
        name: 'Holiday Announcement',
        text: 'Notice: The study hall branch {{branchName}} will remain closed on {{holidayDate}} due to {{reason}}. Classes resume on {{resumeDate}}.',
      },
      {
        id: 'general_notice',
        name: 'General Announcement',
        text: 'Dear Students, {{message}}. Thank you for your cooperation.',
      },
    ];
  }

  async sendBroadcast(workspaceId: string, data: any) {
    const { templateId, customVariables, filters } = data;
    const { branchId, shiftId } = filters || {};

    const profileWhere: any = { status: 'APPROVED' };
    if (branchId) profileWhere.branchId = branchId;

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

    const students = await StudentProfile.findAll({
      where: profileWhere,
      include: includeList,
    });

    const templates = await this.getTemplates();
    const template = templates.find((t) => t.id === templateId);
    const templateText = template ? template.text : 'Broadcast message';

    const logs: any[] = [];
    for (const student of students) {
      const recipient = student.user.mobile || 'Unknown';
      let message = templateText.replace('{{studentName}}', student.user.name);

      if (customVariables) {
        Object.keys(customVariables).forEach((key) => {
          message = message.replace(`{{${key}}}`, customVariables[key]);
        });
      }

      // Simulating API Dispatch
      console.log(`[WhatsApp Broadcast] Sending message to ${recipient}: "${message}"`);

      const log = await WhatsAppLog.create({
        workspaceId,
        recipient,
        message,
        status: 'SENT',
      } as any);

      logs.push(log);
    }

    return {
      sentCount: logs.length,
      logs,
    };
  }

  async getLogs(workspaceId: string) {
    return WhatsAppLog.findAll({
      where: { workspaceId },
      order: [['sentAt', 'DESC']],
    });
  }
}
