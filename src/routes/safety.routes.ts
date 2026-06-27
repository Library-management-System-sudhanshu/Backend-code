import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import { User, UserRole } from '../models/user.model';
import { FirebaseService } from '../services/firebase.service';

const router = Router();

router.post(
  '/alarm',
  authenticateJWT,
  requireRoles('OWNER', 'MANAGER', 'STAFF'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { type, gate, message, branchId } = req.body;
      const user = (req as any).user;
      const workspaceId = user.workspaceId;

      if (!type || !gate) {
        res.status(400).json({ message: 'Alarm type and exit gate are required' });
        return;
      }

      // Fetch all students in the workspace/branch
      const queryWhere: any = {
        workspaceId,
        role: UserRole.STUDENT,
      };
      if (branchId) {
        queryWhere.branchId = branchId;
      }

      const students = await User.findAll({
        where: queryWhere,
        attributes: ['fcmToken'],
      });

      const tokens = students
        .map((u) => u.fcmToken)
        .filter((t): t is string => !!t && t.trim().length > 0);

      const title = `EMERGENCY ALERT: ${type.toUpperCase()}`;
      const body = `Evacuate immediately via Exit: ${gate}`;

      // Send FCM push notifications
      if (tokens.length > 0) {
        await FirebaseService.sendPushNotification(tokens, title, body, {
          type: 'safety-alarm',
          alarmType: type,
          gate,
          message: message || `A ${type} emergency safety alarm has been triggered. Please evacuate via ${gate} immediately.`,
        });
      } else {
        console.log('[Safety Alarm] No student FCM tokens registered for this branch/workspace.');
      }

      res.status(200).json({
        success: true,
        message: 'Safety alarm broadcasted successfully',
        recipientsCount: tokens.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
