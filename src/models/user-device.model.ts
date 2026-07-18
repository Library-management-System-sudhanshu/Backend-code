import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { User } from './user.model';

@Table({ tableName: 'user_devices' })
export class UserDevice extends Model<UserDevice> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Index
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  userId: string;

  @BelongsTo(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Index
  @Column({ type: DataType.TEXT, allowNull: false })
  fcmToken: string;

  @Column({
    type: DataType.ENUM('ANDROID', 'IOS', 'WEB'),
    allowNull: true,
  })
  deviceType: string;

  @Column({ type: DataType.STRING, allowNull: true })
  deviceName: string;
}
