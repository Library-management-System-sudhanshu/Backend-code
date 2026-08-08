import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { Workspace } from './workspace.model';

export enum BroadcastChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

export enum BroadcastLogStatus {
  SENT = 'SENT',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

@Table({
  tableName: 'broadcast_logs',
  indexes: [
    { fields: ['workspaceId', 'sentAt'] },
    { fields: ['channel'] },
  ],
})
export class BroadcastLog extends Model<BroadcastLog> {
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

  @Column({
    type: DataType.ENUM('SMS', 'EMAIL'),
    allowNull: false,
  })
  channel: BroadcastChannel;

  @Column({ type: DataType.STRING, allowNull: false })
  recipient: string;

  @Column({ type: DataType.STRING, allowNull: true })
  subject: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  message: string;

  @Column({
    type: DataType.ENUM('SENT', 'FAILED', 'PENDING'),
    allowNull: false,
    defaultValue: 'PENDING',
  })
  status: BroadcastLogStatus;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  sentAt: Date;
}
