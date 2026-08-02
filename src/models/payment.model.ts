import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { StudentProfile } from './student-profile.model';
import { SubscriptionPlan } from './subscription-plan.model';
import { Workspace } from './workspace.model';
import { Branch } from './branch.model';

export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  RAZORPAY = 'RAZORPAY',
}
export enum PaymentStatus {
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  UNPAID = 'UNPAID',
  REFUNDED = 'REFUNDED',
}

@Table({
  tableName: 'payments',
  paranoid: true,
  indexes: [
    { fields: ['workspaceId', 'status'] },
    { fields: ['studentProfileId', 'status'] },
  ],
})
export class Payment extends Model<Payment> {
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
  @ForeignKey(() => Branch)
  @Column({ type: DataType.UUID, allowNull: false })
  branchId: string;

  @BelongsTo(() => Branch, { onDelete: 'CASCADE' })
  branch: Branch;

  @Index
  @ForeignKey(() => StudentProfile)
  @Column({ type: DataType.UUID, allowNull: false })
  studentProfileId: string;

  @BelongsTo(() => StudentProfile, { onDelete: 'CASCADE' })
  studentProfile: StudentProfile;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount: number;

  @Column({
    type: DataType.ENUM('PAID', 'PARTIAL', 'UNPAID', 'REFUNDED'),
    allowNull: false,
    defaultValue: 'UNPAID',
  })
  status: PaymentStatus;

  @Column({
    type: DataType.ENUM('CASH', 'UPI', 'RAZORPAY'),
    allowNull: false,
  })
  method: PaymentMethod;

  @Column({ type: DataType.STRING, allowNull: true })
  transactionId: string;

  @Index
  @ForeignKey(() => SubscriptionPlan)
  @Column({ type: DataType.UUID, allowNull: true })
  subscriptionPlanId: string;

  @BelongsTo(() => SubscriptionPlan, { onDelete: 'SET NULL' })
  subscriptionPlan: SubscriptionPlan;

  @Column({ type: DataType.STRING, allowNull: true })
  invoiceUrl: string;

  @Column({ type: DataType.STRING, allowNull: true })
  receiptUrl: string;

  @Column({ type: DataType.DATE, allowNull: true })
  dueDate: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  paidAt: Date;
}
