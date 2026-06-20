import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Workspace } from './workspace.model';

@Table({ tableName: 'whatsapp_logs' })
export class WhatsAppLog extends Model<WhatsAppLog> {
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
  recipient: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  message: string;

  @Column({ type: DataType.STRING, allowNull: false })
  status: string; // SENT, FAILED

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  sentAt: Date;
}
