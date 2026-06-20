import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Workspace } from './workspace.model';
import { StudentSubscription } from './student-subscription.model';

@Table({ tableName: 'subscription_plans' })
export class SubscriptionPlan extends Model<SubscriptionPlan> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Workspace)
  @Column({ type: DataType.UUID, allowNull: false })
  workspaceId: string;

  @BelongsTo(() => Workspace)
  workspace: Workspace;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  durationDays: number;

  @Column({ type: DataType.DOUBLE, allowNull: false })
  price: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive: boolean;

  @HasMany(() => StudentSubscription)
  studentSubscriptions: StudentSubscription[];
}
