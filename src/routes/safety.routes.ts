import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import { User, UserRole } from '../models/user.model';
import { StudentProfile } from '../models/student-profile.model';
import { UserDevice } from '../models/user-device.model';
import { FirebaseService } from '../services/firebase.service';

import { tenantIsolation } from '../middlewares/tenant.middleware';

const router = Router();

router.post(
  '/alarm',
  authenticateJWT,
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  tenantIsolation,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { type, gate, message, branchId } = req.body;
      const user = (req as any).user;
      const workspaceId = user.workspaceId;

      if (!type || !gate) {
        res
          .status(400)
          .json({ message: 'Alarm type and exit gate are required' });
        return;
      }

      // Fetch all students in the workspace/branch
      const queryWhere: any = {
        workspaceId,
        status: 'APPROVED',
      };
      if (branchId) {
        queryWhere.branchId = branchId;
      }

      const students = await StudentProfile.findAll({
        where: queryWhere,
        attributes: ['userId'],
      });

      const studentIds = students.map((u) => u.userId);

      // Fetch FCM tokens from UserDevice table
      const devices =
        studentIds.length > 0
          ? await UserDevice.findAll({ where: { userId: studentIds } })
          : [];

      const tokens = devices
        .map((d) => d.fcmToken)
        .filter((t): t is string => !!t && t.trim().length > 0);

      const title = `EMERGENCY ALERT: ${type.toUpperCase()}`;
      const body = `Evacuate immediately via Exit: ${gate}`;

      // Send FCM push notifications
      if (tokens.length > 0) {
        await FirebaseService.sendPushNotification(tokens, title, body, {
          type: 'safety-alarm',
          alarmType: type,
          gate,
          message:
            message ||
            `A ${type} emergency safety alarm has been triggered. Please evacuate via ${gate} immediately.`,
        });
      } else {
        console.log(
          '[Safety Alarm] No student FCM tokens registered for this branch/workspace.',
        );
      }

      res.status(200).json({
        success: true,
        message: 'Safety alarm broadcasted successfully',
        recipientsCount: tokens.length,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
