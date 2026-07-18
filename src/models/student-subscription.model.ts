import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { StudentProfile } from './student-profile.model';
import { SubscriptionPlan } from './subscription-plan.model';
import { Workspace } from './workspace.model';

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  FROZEN = 'FROZEN',
}

@Table({
  tableName: 'student_subscriptions',
  paranoid: true,
  indexes: [
    { fields: ['workspaceId', 'status'] },
  ],
})
export class StudentSubscription extends Model<StudentSubscription> {
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
  @ForeignKey(() => StudentProfile)
  @Column({ type: DataType.UUID, allowNull: false })
  studentProfileId: string;

  @BelongsTo(() => StudentProfile, { onDelete: 'CASCADE' })
  studentProfile: StudentProfile;

  @Index
  @ForeignKey(() => SubscriptionPlan)
  @Column({ type: DataType.UUID, allowNull: false })
  subscriptionPlanId: string;

  @BelongsTo(() => SubscriptionPlan, { onDelete: 'RESTRICT' })
  plan: SubscriptionPlan;

  @Column({ type: DataType.DATE, allowNull: false })
  startDate: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  endDate: Date;

  @Column({
    type: DataType.ENUM('ACTIVE', 'EXPIRED', 'FROZEN'),
    defaultValue: 'ACTIVE',
  })
  status: SubscriptionStatus;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  isFrozen: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  freezeDate: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  unfreezeDate: Date;
}
