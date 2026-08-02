import { Router } from 'express';
import { getSaaSPlans, createSaaSPlan, updateSaaSPlan } from '../controllers/saas-plan.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';

const router = Router();

router.get('/test', (req, res) => {
  res.send('saas-plan routes mounted ok');
});

// Publicly readable for workspaces to see pricing? Or protected?
// Let's protect them for now, but allow any logged in user to GET plans.
router.get('/', authenticateJWT, getSaaSPlans);

// Only SUPER_ADMIN can create/update SaaS plans
router.post('/', authenticateJWT, requireRoles('SUPER_ADMIN'), createSaaSPlan);
router.put('/:id', authenticateJWT, requireRoles('SUPER_ADMIN'), updateSaaSPlan);

export default router;
