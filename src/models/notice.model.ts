import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { Workspace } from './workspace.model';
import { User } from './user.model';

@Table({ tableName: 'notices', paranoid: true })
export class Notice extends Model<Notice> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  title: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  content: string;

  @Index
  @ForeignKey(() => Workspace)
  @Column({ type: DataType.UUID, allowNull: false })
  workspaceId: string;

  @BelongsTo(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  createdById: string;

  @BelongsTo(() => User, { foreignKey: 'createdById', onDelete: 'SET NULL' })
  createdBy: User;
}
