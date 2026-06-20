import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { User } from './user.model';
import { Branch } from './branch.model';
import { SeatAllocation } from './seat-allocation.model';
import { StudentSubscription } from './student-subscription.model';
import { Payment } from './payment.model';
import { Attendance } from './attendance.model';
import { Complaint } from './complaint.model';
import { BookIssue } from './book-issue.model';

@Table({ tableName: 'student_profiles' })
export class StudentProfile extends Model<StudentProfile> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  userId: string;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Branch)
  @Column({ type: DataType.UUID, allowNull: false })
  branchId: string;

  @BelongsTo(() => Branch)
  branch: Branch;

  @Column({ type: DataType.STRING, allowNull: true })
  guardianName: string;

  @Column({ type: DataType.STRING, allowNull: true })
  guardianMobile: string;

  @Column({ type: DataType.STRING, allowNull: true })
  aadharNumber: string;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  joiningDate: Date;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'PENDING', // PENDING, APPROVED, REJECTED, WAITLISTED
  })
  status: string;

  @Column({ type: DataType.STRING, allowNull: true })
  qrCodeUrl: string;

  @HasMany(() => SeatAllocation)
  allocations: SeatAllocation[];

  @HasMany(() => StudentSubscription)
  subscriptions: StudentSubscription[];

  @HasMany(() => Payment)
  payments: Payment[];

  @HasMany(() => Attendance)
  attendance: Attendance[];

  @HasMany(() => Complaint)
  complaints: Complaint[];

  @HasMany(() => BookIssue)
  bookIssues: BookIssue[];
}
