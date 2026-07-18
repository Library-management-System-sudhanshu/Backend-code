import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, Index } from 'sequelize-typescript';
import { User } from './user.model';
import { Branch } from './branch.model';
import { Workspace } from './workspace.model';
import { SeatAllocation } from './seat-allocation.model';
import { StudentSubscription } from './student-subscription.model';
import { Payment } from './payment.model';
import { Attendance } from './attendance.model';
import { Complaint } from './complaint.model';
import { BookIssue } from './book-issue.model';

export enum StudentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WAITLISTED = 'WAITLISTED',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

@Table({ tableName: 'student_profiles', paranoid: true })
export class StudentProfile extends Model<StudentProfile> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Index
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  userId: string;

  @BelongsTo(() => User, { onDelete: 'CASCADE' })
  user: User;

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

  @Column({ type: DataType.STRING, allowNull: true })
  guardianName: string;

  @Column({ type: DataType.STRING, allowNull: true })
  guardianMobile: string;

  @Column({ type: DataType.STRING, allowNull: true })
  aadharNumber: string;

  @Column({
    type: DataType.ENUM('MALE', 'FEMALE', 'OTHER'),
    allowNull: true,
  })
  gender: Gender;

  @Column({ type: DataType.TEXT, allowNull: true })
  address: string;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  joiningDate: Date;

  @Column({
    type: DataType.ENUM('PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED'),
    allowNull: false,
    defaultValue: 'PENDING',
  })
  status: StudentStatus;

  @Column({ type: DataType.STRING, allowNull: true })
  qrCodeUrl: string;

  // TODO: Consider replacing with a ledger-based calculation (sum of debits - credits)
  // to avoid race conditions and out-of-sync financial data.
  @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0 })
  dueAmount: number;

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
