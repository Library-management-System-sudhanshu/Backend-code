import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Workspace } from './workspace.model';
import { SaaSPlan } from './saas-plan.model';

@Table({
  tableName: 'saas_payments',
  indexes: [{ fields: ['workspaceId', 'createdAt'] }],
})
export class SaaSPayment extends Model<SaaSPayment> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;
  @ForeignKey(() => Workspace)
  @Column({ type: DataType.UUID, allowNull: false })
  workspaceId: string;
  @BelongsTo(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;
  @ForeignKey(() => SaaSPlan)
  @Column({ type: DataType.UUID, allowNull: false })
  saasPlanId: string;
  @BelongsTo(() => SaaSPlan, { onDelete: 'RESTRICT' })
  plan: SaaSPlan;
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount: number;
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'INR' })
  currency: string;
  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 30 })
  durationDays: number;
  @Column({ type: DataType.STRING, allowNull: true, unique: true })
  orderId: string;
  @Column({ type: DataType.STRING, allowNull: true, unique: true })
  paymentId: string;
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'PENDING' })
  status: string;
  @Column({ type: DataType.DATE, allowNull: true })
  paidAt: Date;
}
