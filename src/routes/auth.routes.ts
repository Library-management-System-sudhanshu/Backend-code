import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();
const controller = new AuthController();

router.post('/register', (req, res, next) => controller.register(req, res, next));
router.post('/login', (req, res, next) => controller.login(req, res, next));
router.post('/google', (req, res, next) => controller.googleLogin(req, res, next));
router.post('/setup-workspace', authenticateJWT, (req, res, next) => controller.setupWorkspace(req, res, next));
router.post('/otp-request', (req, res, next) => controller.otpRequest(req, res, next));
router.post('/otp-verify', (req, res, next) => controller.otpVerify(req, res, next));
router.post('/fcm-token', authenticateJWT, (req, res, next) => controller.updateFcmToken(req, res, next));
router.get('/profile', authenticateJWT, (req, res, next) => controller.getProfile(req, res, next));
router.patch('/profile', authenticateJWT, (req, res, next) => controller.updateProfile(req, res, next));

export default router;
