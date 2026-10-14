import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { User } from './user.model';
import { Workspace } from './workspace.model';
import { Branch } from './branch.model';

@Table({
  tableName: 'workspace_memberships',
  indexes: [{ unique: true, fields: ['userId', 'workspaceId'] }],
})
export class WorkspaceMembership extends Model<WorkspaceMembership> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  userId: string;
  @BelongsTo(() => User, { onDelete: 'CASCADE' }) user: User;
  @ForeignKey(() => Workspace)
  @Column({ type: DataType.UUID, allowNull: false })
  workspaceId: string;
  @BelongsTo(() => Workspace, { onDelete: 'CASCADE' }) workspace: Workspace;
  @Column({ type: DataType.STRING, allowNull: false }) role: string;
  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'ACTIVE' })
  status: string;
  @HasMany(() => MembershipBranch) branches: MembershipBranch[];
}

@Table({
  tableName: 'membership_branches',
  indexes: [{ unique: true, fields: ['membershipId', 'branchId'] }],
})
export class MembershipBranch extends Model<MembershipBranch> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;
  @ForeignKey(() => WorkspaceMembership)
  @Column({ type: DataType.UUID, allowNull: false })
  membershipId: string;
  @BelongsTo(() => WorkspaceMembership, { onDelete: 'CASCADE' })
  membership: WorkspaceMembership;
  @ForeignKey(() => Branch)
  @Column({ type: DataType.UUID, allowNull: false })
  branchId: string;
  @BelongsTo(() => Branch, { onDelete: 'CASCADE' }) branch: Branch;
}
