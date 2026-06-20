import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Workspace } from './workspace.model';

@Table({ tableName: 'workspace_settings' })
export class WorkspaceSetting extends Model<WorkspaceSetting> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Workspace)
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  workspaceId: string;

  @BelongsTo(() => Workspace)
  workspace: Workspace;

  @Column({ type: DataType.TEXT, allowNull: true })
  receiptFormat: string;

  @Column({ type: DataType.STRING, defaultValue: '#2563EB' })
  themeColor: string;
}
