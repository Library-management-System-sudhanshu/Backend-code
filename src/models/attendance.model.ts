import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { StudentProfile } from './student-profile.model';
import { Workspace } from './workspace.model';
import { Branch } from './branch.model';

export enum AttendanceMethod {
  MANUAL = 'MANUAL',
  QR_CODE = 'QR_CODE',
  APP_CHECK_IN = 'APP_CHECK_IN',
}

@Table({
  tableName: 'attendances',
  paranoid: true,
  indexes: [
    { fields: ['studentProfileId', 'date'] },
    { fields: ['workspaceId', 'date'] },
    { fields: ['branchId', 'date'] },
  ],
})
export class Attendance extends Model<Attendance> {
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

  @Index
  @ForeignKey(() => Branch)
  @Column({ type: DataType.UUID, allowNull: false })
  branchId: string;

  @BelongsTo(() => Branch, { onDelete: 'CASCADE' })
  branch: Branch;

  @Index
  @ForeignKey(() => StudentProfile)
  @Column({ type: DataType.UUID, allowNull: false })
  studentProfileId: string;

  @BelongsTo(() => StudentProfile, { onDelete: 'CASCADE' })
  studentProfile: StudentProfile;

  @Column({ type: DataType.DATEONLY, allowNull: false, defaultValue: DataType.NOW })
  date: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  checkIn: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  checkOut: Date;

  @Column({
    type: DataType.ENUM('MANUAL', 'QR_CODE', 'APP_CHECK_IN'),
    allowNull: false,
    defaultValue: 'MANUAL',
  })
  method: AttendanceMethod;
}
