import { WorkspaceMembership } from '../models/workspace-membership.model';
import { StudentProfile } from '../models/student-profile.model';
import { Seat } from '../models/seat.model';
import { Payment } from '../models/payment.model';
import { StudentSubscription } from '../models/student-subscription.model';
import { User } from '../models/user.model';
import { Room } from '../models/room.model';
import { Floor } from '../models/floor.model';
import { Branch } from '../models/branch.model';
import { Workspace } from '../models/workspace.model';
import { WorkspaceSubscription } from '../models/workspace-subscription.model';
import { SaaSPlan } from '../models/saas-plan.model';
import { Op } from 'sequelize';

export class DashboardService {
  async getMetrics(workspaceId: string, branchId?: string) {
    // Active students
    const activeStudents = await StudentProfile.count({
      include: [{ model: User }],
      where: {
        status: 'APPROVED',
        workspaceId,
        ...(branchId ? { branchId } : {}),
      },
    });

    // Seat metrics
    const totalSeats = await Seat.count({
      include: [
        {
          model: Room,
          required: true,
          include: [
            {
              model: Floor,
              required: true,
              include: [
                {
                  model: Branch,
                  required: true,
                  where: { workspaceId, ...(branchId ? { id: branchId } : {}) },
                },
              ],
            },
          ],
        },
      ],
    });

    const occupiedSeats = await Seat.count({
      include: [
        {
          model: Room,
          required: true,
          include: [
            {
              model: Floor,
              required: true,
              include: [
                {
                  model: Branch,
                  required: true,
                  where: { workspaceId, ...(branchId ? { id: branchId } : {}) },
                },
              ],
            },
          ],
        },
      ],
      where: { status: 'OCCUPIED' },
    });

    const vacantSeats = totalSeats - occupiedSeats;

    // Use the same outstanding balance shown on each enrollment.
    const duePayments = Number(
      (await StudentProfile.sum('dueAmount', {
        where: { workspaceId, ...(branchId ? { branchId } : {}) },
      })) || 0,
    );

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const paidPaymentsThisMonth = await Payment.findAll({
      include: [
        {
          model: StudentProfile,
          where: { workspaceId, ...(branchId ? { branchId } : {}) },
          required: false,
          include: [{ model: User, required: false }],
        },
      ],
      where: {
        status: { [Op.in]: ['PAID', 'PARTIAL'] },
        workspaceId,
        ...(branchId ? { branchId } : {}),
        paidAt: { [Op.gte]: startOfMonth },
      },
    });
    const monthlyRevenue = paidPaymentsThisMonth.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    // Expiring subscriptions (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const expiringSubscriptions = await StudentSubscription.count({
      include: [
        {
          model: StudentProfile,
          where: { workspaceId, ...(branchId ? { branchId } : {}) },
          required: true,
          include: [{ model: User }],
        },
      ],
      where: {
        status: 'ACTIVE',
        endDate: {
          [Op.between]: [today, sevenDaysFromNow],
        },
      },
    });

    // Mock charts data
    const revenueTrend = [
      { month: 'Jan', amount: monthlyRevenue * 0.7 },
      { month: 'Feb', amount: monthlyRevenue * 0.8 },
      { month: 'Mar', amount: monthlyRevenue * 0.9 },
      { month: 'Apr', amount: monthlyRevenue * 0.85 },
      { month: 'May', amount: monthlyRevenue * 0.95 },
      { month: 'Jun', amount: monthlyRevenue },
    ];

    const occupancyRate =
      totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
    const occupancyTrend = [
      { name: 'Occupied', value: occupiedSeats },
      { name: 'Vacant', value: vacantSeats },
    ];

    return {
      activeStudents,
      occupiedSeats,
      vacantSeats,
      duePayments,
      monthlyRevenue,
      expiringSubscriptions,
      revenueTrend,
      occupancyRate,
      occupancyTrend,
    };
  }

  async getSuperAdminMetrics() {
    const totalWorkspaces = await Workspace.count();

    const activeStudents = await StudentProfile.count({
      where: { status: 'APPROVED' },
    });

    const activeSubscriptions = await WorkspaceSubscription.findAll({
      where: { status: 'ACTIVE' },
      include: [SaaSPlan],
    });

    const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, sub) => {
      return sum + (sub.saasPlan ? Number(sub.saasPlan.price) : 0);
    }, 0);

    const recentWorkspaces = await Workspace.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [
        {
          model: WorkspaceMembership,
          where: { role: 'OWNER', status: 'ACTIVE' },
          required: false,
          include: [{ model: User, attributes: ['id', 'name'] }],
        },
      ],
    });

    const recentOnboardings = await Promise.all(
      recentWorkspaces.map(async (ws) => {
        const sub = await WorkspaceSubscription.findOne({
          where: { workspaceId: ws.id },
          include: [SaaSPlan],
          order: [['createdAt', 'DESC']],
        });

        const owner = ws.memberships?.[0]?.user?.name || 'Unknown';

        return {
          id: ws.id,
          name: ws.name,
          subdomain: ws.subdomain,
          owner: owner,
          plan:
            sub && sub.saasPlan ? sub.saasPlan.name : sub ? sub.status : 'None',
          status: sub ? sub.status : 'NO_SUBSCRIPTION',
          createdAt: ws.createdAt,
        };
      }),
    );

    return {
      totalWorkspaces,
      activeStudents,
      monthlyRecurringRevenue,
      platformUptime: '99.9%',
      recentOnboardings,
    };
  }
}
