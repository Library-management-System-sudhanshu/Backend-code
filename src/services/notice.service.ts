import { Notice } from '../models/notice.model';
import { User, UserRole } from '../models/user.model';
import { UserDevice } from '../models/user-device.model';
import { FirebaseService } from './firebase.service';
import { NotFoundException } from '../middlewares/error.middleware';

export class NoticeService {
  async createNotice(
    workspaceId: string,
    createdById: string,
    data: { title: string; content: string }
  ) {
    // 1. Create notice in DB
    const notice = await Notice.create({
      title: data.title,
      content: data.content,
      workspaceId,
      createdById,
    } as any);

    // 2. Fetch all student users in the workspace
    const studentUsers = await User.findAll({
      where: {
        workspaceId,
        role: UserRole.STUDENT,
      },
      attributes: ['id'],
    });

    const studentIds = studentUsers.map((u) => u.id);

    // 3. Fetch FCM tokens from UserDevice table
    const devices = studentIds.length > 0
      ? await UserDevice.findAll({ where: { userId: studentIds } })
      : [];

    const tokens = devices
      .map((d) => d.fcmToken)
      .filter((t): t is string => !!t && t.trim().length > 0);

    // 3. Broadcast notification
    if (tokens.length > 0) {
      await FirebaseService.sendPushNotification(
        tokens,
        `New Notice: ${data.title}`,
        data.content.length > 100 ? `${data.content.substring(0, 97)}...` : data.content,
        {
          type: 'notice',
          noticeId: notice.id,
          title: notice.title,
        }
      );
    } else {
      console.log('[Notice Service] No student FCM tokens registered in this workspace yet.');
    }

    return notice;
  }

  async getWorkspaceNotices(workspaceId: string) {
    return Notice.findAll({
      where: { workspaceId },
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async deleteNotice(id: string, workspaceId: string) {
    const notice = await Notice.findOne({ where: { id, workspaceId } });
    if (!notice) {
      throw new NotFoundException('Notice not found');
    }
    await notice.destroy();
    return { success: true, message: 'Notice deleted successfully' };
  }
}
