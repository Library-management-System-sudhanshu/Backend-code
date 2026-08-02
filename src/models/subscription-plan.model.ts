import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, Index } from 'sequelize-typescript';
import { Workspace } from './workspace.model';
import { StudentSubscription } from './student-subscription.model';

@Table({
  tableName: 'subscription_plans',
  paranoid: true,
  indexes: [
    { unique: true, fields: ['workspaceId', 'name'], where: { deletedAt: null } },
  ],
})
export class SubscriptionPlan extends Model<SubscriptionPlan> {
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

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  durationDays: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  price: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive: boolean;

  @HasMany(() => StudentSubscription)
  studentSubscriptions: StudentSubscription[];
}
