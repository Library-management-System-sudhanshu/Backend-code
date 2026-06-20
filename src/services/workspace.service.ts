import { Workspace } from '../models/workspace.model';
import { Branch } from '../models/branch.model';
import { Shift } from '../models/shift.model';
import { SubscriptionPlan } from '../models/subscription-plan.model';
import { WorkspaceSetting } from '../models/workspace-setting.model';
import { NotFoundException } from '../middlewares/error.middleware';

export class WorkspaceService {
  // Workspaces CRUD (Super Admin)
  async getAllWorkspaces() {
    return Workspace.findAll({ include: [Branch] });
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
    return Branch.findAll({ where: { workspaceId } });
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
    return Shift.findAll({ where: { workspaceId } });
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
    return SubscriptionPlan.findAll({ where: { workspaceId } });
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
}
