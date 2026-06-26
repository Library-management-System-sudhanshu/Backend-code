import { Router } from 'express';
import authRoutes from './auth.routes';
import workspaceRoutes from './workspace.routes';
import studentRoutes from './student.routes';
import seatRoutes from './seat.routes';
import paymentRoutes from './payment.routes';
import attendanceRoutes from './attendance.routes';
import libraryRoutes from './library.routes';
import complaintRoutes from './complaint.routes';
import whatsappRoutes from './whatsapp.routes';
import dashboardRoutes from './dashboard.routes';
import noticeRoutes from './notice.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/students', studentRoutes);
router.use('/seats', seatRoutes);
router.use('/payments', paymentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/library', libraryRoutes);
router.use('/complaints', complaintRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notices', noticeRoutes);

export default router;
