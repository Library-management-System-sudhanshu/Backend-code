import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { StudentProfile } from './student-profile.model';

export enum AttendanceMethod {
  MANUAL = 'MANUAL',
  QR_CODE = 'QR_CODE',
  APP_CHECK_IN = 'APP_CHECK_IN',
}

@Table({ tableName: 'attendances' })
export class Attendance extends Model<Attendance> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => StudentProfile)
  @Column({ type: DataType.UUID, allowNull: false })
  studentProfileId: string;

  @BelongsTo(() => StudentProfile)
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
