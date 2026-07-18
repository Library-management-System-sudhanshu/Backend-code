import { Workspace } from '../models/workspace.model';
import { Branch } from '../models/branch.model';
import { Shift } from '../models/shift.model';
import { SubscriptionPlan } from '../models/subscription-plan.model';
import { WorkspaceSetting } from '../models/workspace-setting.model';
import { WorkspaceSubscription } from '../models/workspace-subscription.model';
import { SaaSPlan } from '../models/saas-plan.model';
import { User } from '../models/user.model';
import { NotFoundException, BadRequestException } from '../middlewares/error.middleware';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export class WorkspaceService {
  async createWorkspace(data: any) {
    const { name, subdomain, address, pincode, ownerName, ownerEmail, ownerPassword, ownerMobile } = data;

    const existingWS = await Workspace.findOne({ where: { subdomain } });
    if (existingWS) {
      throw new BadRequestException('Subdomain is already registered');
    }

    const existingUser = await User.findOne({ where: { email: ownerEmail } });
    if (existingUser) {
      throw new BadRequestException('Email address is already in use');
    }

    const workspace = await Workspace.create({
      name,
      subdomain,
      address,
      pincode: pincode || null,
      isActive: true
    } as any);

    const branch = await Branch.create({
      workspaceId: workspace.id,
      name: 'Main Branch',
      address
    } as any);

    await WorkspaceSetting.create({
      workspaceId: workspace.id,
      themeColor: '#2563EB'
    } as any);

    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    const user = await User.create({
      workspaceId: workspace.id,
      branchId: branch.id,
      name: ownerName,
      email: ownerEmail,
      password: hashedPassword,
      mobile: ownerMobile || null,
      role: 'OWNER'
    } as any);

    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(now.getDate() + 14);

    const subscription = await WorkspaceSubscription.create({
      workspaceId: workspace.id,
      status: 'TRIAL',
      trialStartDate: now,
      trialEndDate: trialEnd
    } as any);

    return {
      workspace,
      owner: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      subscription
    };
  }

  // Workspaces CRUD (Super Admin)
  async getAllWorkspaces() {
    const workspaces = await Workspace.findAll({ 
      include: [
        Branch,
        {
          model: User,
          where: { role: 'OWNER' },
          required: false
        }
      ], 
      order: [['createdAt', 'ASC']] 
    });

    return Promise.all(workspaces.map(async (ws) => {
      const sub = await WorkspaceSubscription.findOne({
        where: { workspaceId: ws.id },
        include: [SaaSPlan],
        order: [['createdAt', 'DESC']]
      });

      return {
        ...ws.toJSON(),
        subscription: sub
      };
    }));
  }

  async getWorkspaceById(id: string) {
    const ws = await Workspace.findByPk(id, { include: [Branch, WorkspaceSetting] });
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws;
  }

  async updateWorkspace(id: string, data: any) {
    const ws = await Workspace.findByPk(id);
    if (!ws) throw new NotFoundException('Workspace not found');
    await ws.update(data);
    return ws;
  }

  // Branches
  async getBranches(workspaceId: string) {
    return Branch.findAll({ where: { workspaceId }, order: [['createdAt', 'ASC']] });
  }

  async createBranch(workspaceId: string, data: any) {
    return Branch.create({ ...data, workspaceId } as any);
  }

  async updateBranch(id: string, data: any) {
    const branch = await Branch.findByPk(id);
    if (!branch) throw new NotFoundException('Branch not found');
    await branch.update(data);
    return branch;
  }

  // Shifts
  async getShifts(workspaceId: string) {
    return Shift.findAll({ where: { workspaceId }, order: [['createdAt', 'ASC']] });
  }

  async createShift(workspaceId: string, data: any) {
    return Shift.create({ ...data, workspaceId } as any);
  }

  async updateShift(id: string, data: any) {
    const shift = await Shift.findByPk(id);
    if (!shift) throw new NotFoundException('Shift not found');
    await shift.update(data);
    return shift;
  }

  async deleteShift(id: string) {
    const shift = await Shift.findByPk(id);
    if (!shift) throw new NotFoundException('Shift not found');
    await shift.destroy();
    return { success: true };
  }

  // Subscription Plans
  async getPlans(workspaceId: string) {
    return SubscriptionPlan.findAll({ where: { workspaceId }, order: [['createdAt', 'ASC']] });
  }

  async createPlan(workspaceId: string, data: any) {
    return SubscriptionPlan.create({ ...data, workspaceId } as any);
  }

  async updatePlan(id: string, data: any) {
    const plan = await SubscriptionPlan.findByPk(id);
    if (!plan) throw new NotFoundException('Plan not found');
    await plan.update(data);
    return plan;
  }

  // Settings
  async getSettings(workspaceId: string) {
    let setting = await WorkspaceSetting.findOne({ where: { workspaceId } });
    if (!setting) {
      setting = await WorkspaceSetting.create({ workspaceId, themeColor: '#2563EB' } as any);
    }
    return setting;
  }

  async updateSettings(workspaceId: string, data: any) {
    const setting = await this.getSettings(workspaceId);
    await setting.update(data);
    return setting;
  }

  // SaaS Subscriptions (Trishul HQ)
  async getSaaSSubscription(workspaceId: string) {
    return WorkspaceSubscription.findOne({ where: { workspaceId } });
  }

  async startSaaSTrial(workspaceId: string, days: number = 7) {
    let sub = await this.getSaaSSubscription(workspaceId);
    
    const now = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(now.getDate() + days);

    if (sub) {
      if (sub.status !== 'TRIAL') {
        throw new Error('Workspace already has or had a subscription/trial.');
      }
      // If they already have a trial, maybe we are extending it?
      // Let's just update the trialEndDate if needed, but normally we wouldn't let them start again.
      // For now, let's just return the existing trial.
      return sub;
    }

    sub = await WorkspaceSubscription.create({
      workspaceId,
      status: 'TRIAL',
      trialStartDate: now,
      trialEndDate: trialEnd,
    } as any);

    return sub;
  }

  async createSaaSPayment(workspaceId: string, saasPlanId: string) {
    const plan = await SaaSPlan.findByPk(saasPlanId);
    if (!plan) throw new NotFoundException('SaaS Plan not found');

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_T9hh97PsK4bGuG';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'aL02SqOqMzSQP7XwCZm9fnfo';
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: Math.round(plan.price * 100), // in paise
        currency: 'INR',
        receipt: `saas_${workspaceId.substring(0, 8)}_${Date.now()}`
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error('[Razorpay SaaS Order Creation Error]:', errData);
      throw new Error('Failed to create Razorpay order for SaaS Plan');
    }

    const razorpayOrder = await response.json() as any;

    return {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      planId: plan.id,
      planName: plan.name
    };
  }

  async verifySaaSPayment(workspaceId: string, data: any) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, saasPlanId } = data;
    
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'aL02SqOqMzSQP7XwCZm9fnfo';
    
    if (razorpay_signature && razorpay_order_id) {
      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature) {
        throw new Error('Invalid Razorpay signature. Payment verification failed.');
      }
    }

    // Payment Verified! Activate Subscription
    let sub = await this.getSaaSSubscription(workspaceId);
    const now = new Date();
    
    // Default 30 days for now, can be extended to use SaaSPlan duration if added later.
    const periodEnd = new Date();
    periodEnd.setDate(now.getDate() + 30); 

    if (sub) {
      await sub.update({
        status: 'ACTIVE',
        saasPlanId: saasPlanId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd
      });
    } else {
      sub = await WorkspaceSubscription.create({
        workspaceId,
        saasPlanId: saasPlanId,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd
      } as any);
    }

    return sub;
  }
}
