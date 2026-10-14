import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Workspace } from './workspace.model';
import { User } from './user.model';

@Table({
  tableName: 'workspace_access_grants',
  indexes: [{ fields: ['workspaceId', 'createdAt'] }],
})
export class WorkspaceAccessGrant extends Model<WorkspaceAccessGrant> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;
  @ForeignKey(() => Workspace)
  @Column({ type: DataType.UUID, allowNull: false })
  workspaceId: string;
  @BelongsTo(() => Workspace, { onDelete: 'CASCADE' }) workspace: Workspace;
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  grantedById: string;
  @BelongsTo(() => User, { foreignKey: 'grantedById', onDelete: 'CASCADE' })
  grantedBy: User;
  @Column({ type: DataType.STRING, allowNull: false }) mode:
    | 'READ_ONLY'
    | 'FULL';
  @Column({ type: DataType.DATE, allowNull: false }) expiresAt: Date;
  @Column({ type: DataType.TEXT, allowNull: false }) reason: string;
  @Column({ type: DataType.DATE, allowNull: true }) revokedAt: Date | null;
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  revokedById: string;
  @BelongsTo(() => User, { foreignKey: 'revokedById', onDelete: 'SET NULL' })
  revokedBy: User;
}
