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
import safetyRoutes from './safety.routes';
import saasPlanRoutes from './saas-plan.routes';
import smsRoutes from './sms.routes';
import emailRoutes from './email.routes';

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
router.use('/safety', safetyRoutes);
router.use('/saas-plans', saasPlanRoutes);
router.use('/sms', smsRoutes);
router.use('/email', emailRoutes);

import fs from 'fs';
import path from 'path';

router.post('/upload', (req, res) => {
  try {
    const { base64 } = req.body;
    if (!base64) {
      return res.status(400).json({ message: 'No base64 data provided' });
    }

    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: 'Invalid base64 string' });
    }

    const type = matches[1];
    const data = Buffer.from(matches[2], 'base64');
    
    let extension = 'png';
    if (type.includes('jpeg') || type.includes('jpg')) extension = 'jpg';
    if (type.includes('webp')) extension = 'webp';
    if (type.includes('gif')) extension = 'gif';

    const filename = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
    const uploadsDir = path.join(__dirname, '../../uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(uploadsDir, filename), data);

    return res.status(200).json({ url: `/uploads/${filename}` });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Upload failed' });
  }
});

export default router;
