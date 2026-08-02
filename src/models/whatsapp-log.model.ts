import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { Workspace } from './workspace.model';

export enum WhatsAppLogStatus {
  SENT = 'SENT',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

@Table({
  tableName: 'whatsapp_logs',
  indexes: [
    { fields: ['workspaceId', 'sentAt'] },
  ],
})
export class WhatsAppLog extends Model<WhatsAppLog> {
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
  recipient: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  message: string;

  @Column({
    type: DataType.ENUM('SENT', 'FAILED', 'PENDING'),
    allowNull: false,
    defaultValue: 'PENDING',
  })
  status: WhatsAppLogStatus;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  sentAt: Date;
}
