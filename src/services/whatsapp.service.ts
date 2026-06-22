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

  async sendMessage(workspaceId: string, studentProfileId: string, data: any) {
    const { templateId, customVariables } = data;

    const student = await StudentProfile.findOne({
      where: { id: studentProfileId, status: 'APPROVED' },
      include: [
        {
          model: User,
          where: { workspaceId },
          required: true,
        },
      ],
    });

    if (!student || !student.user) {
      return null;
    }

    const templates = await this.getTemplates();
    const template = templates.find((t) => t.id === templateId);
    const templateText = template ? template.text : 'Broadcast message';

    const recipient = student.user.mobile || 'Unknown';
    let message = templateText.replace('{{studentName}}', student.user.name);

    if (customVariables) {
      Object.keys(customVariables).forEach((key) => {
        message = message.replace(`{{${key}}}`, customVariables[key]);
      });
    }

    const isSent = await this.dispatchToWaha(recipient, message);

    const log = await WhatsAppLog.create({
      workspaceId,
      recipient,
      message,
      status: isSent ? 'SENT' : 'FAILED',
    } as any);

    return log;
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

      const isSent = await this.dispatchToWaha(recipient, message);

      const log = await WhatsAppLog.create({
        workspaceId,
        recipient,
        message,
        status: isSent ? 'SENT' : 'FAILED',
      } as any);

      logs.push(log);
    }

    return {
      sentCount: logs.filter((l) => l.status === 'SENT').length,
      logs,
    };
  }

  async getLogs(workspaceId: string) {
    return WhatsAppLog.findAll({
      where: { workspaceId },
      order: [['sentAt', 'DESC']],
    });
  }

  private async dispatchToWaha(recipient: string, message: string): Promise<boolean> {
    const wahaUrl = process.env.WAHA_URL;
    const apiKey = process.env.WAHA_API_KEY;
    const session = process.env.WAHA_SESSION || 'default';

    if (!wahaUrl) {
      console.log(`[WhatsApp Simulator (Fallback)] Sending message to ${recipient}: "${message}"`);
      return true;
    }

    // Sanitize recipient number to digits only
    const sanitizedRecipient = recipient.replace(/\D/g, '');
    if (!sanitizedRecipient) {
      console.error('[WhatsApp Service Error] Recipient number contains no digits:', recipient);
      return false;
    }

    // WAHA expects the chatId format to be {phone_number}@c.us
    const chatId = `${sanitizedRecipient}@c.us`;

    try {
      const url = `${wahaUrl}/api/sendText`;
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['X-Api-Key'] = apiKey;
      }

      console.log(`[WhatsApp API Call] Sending to ${chatId} via WAHA at ${url}...`);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session,
          chatId,
          text: message,
        }),
      });

      const responseData = (await response.json()) as any;

      if (!response.ok) {
        console.error('[WhatsApp Service Error] WAHA API Error Response:', responseData);
        return false;
      }

      console.log(
        `[WhatsApp Service Success] Message sent successfully to ${chatId}. Message ID: ${responseData?.id}`
      );
      return true;
    } catch (error) {
      console.error('[WhatsApp Service Error] Failed to call WAHA API:', error);
      return false;
    }
  }
}
