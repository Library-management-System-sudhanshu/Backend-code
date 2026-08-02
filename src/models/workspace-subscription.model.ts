import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { Workspace } from './workspace.model';
import { SaaSPlan } from './saas-plan.model';

@Table({ tableName: 'workspace_subscriptions', paranoid: true })
export class WorkspaceSubscription extends Model<WorkspaceSubscription> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Index
  @ForeignKey(() => Workspace)
  @Column({ type: DataType.UUID, allowNull: false })
  workspaceId: string;

  @BelongsTo(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @Index
  @ForeignKey(() => SaaSPlan)
  @Column({ type: DataType.UUID, allowNull: true })
  saasPlanId: string;

  @BelongsTo(() => SaaSPlan, { onDelete: 'SET NULL' })
  saasPlan: SaaSPlan;

  @Column({ 
    type: DataType.ENUM('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'), 
    allowNull: false 
  })
  status: string;

  @Column({ type: DataType.DATE, allowNull: true })
  trialStartDate: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  trialEndDate: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  currentPeriodStart: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  currentPeriodEnd: Date;
}
