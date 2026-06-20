import { Table, Column, Model, DataType, HasMany, HasOne } from 'sequelize-typescript';
import { User } from './user.model';
import { Branch } from './branch.model';
import { Shift } from './shift.model';
import { SubscriptionPlan } from './subscription-plan.model';
import { WorkspaceSetting } from './workspace-setting.model';

@Table({ tableName: 'workspaces' })
export class Workspace extends Model<Workspace> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  subdomain: string;

  @Column({ type: DataType.STRING, allowNull: true })
  logo: string;

  @Column({ type: DataType.STRING, allowNull: true })
  gstNumber: string;

  @Column({ type: DataType.STRING, allowNull: false })
  address: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive: boolean;

  @HasMany(() => User)
  users: User[];

  @HasMany(() => Branch)
  branches: Branch[];

  @HasMany(() => Shift)
  shifts: Shift[];

  @HasMany(() => SubscriptionPlan)
  plans: SubscriptionPlan[];

  @HasOne(() => WorkspaceSetting)
  settings: WorkspaceSetting;
}
