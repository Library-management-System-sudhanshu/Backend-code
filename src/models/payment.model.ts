import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { StudentProfile } from './student-profile.model';

export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  RAZORPAY = 'RAZORPAY',
}
export enum PaymentStatus {
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  UNPAID = 'UNPAID',
  REFUNDED = 'REFUNDED',
}

@Table({ tableName: 'payments' })
export class Payment extends Model<Payment> {
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

  @Column({ type: DataType.DOUBLE, allowNull: false })
  amount: number;

  @Column({
    type: DataType.ENUM('PAID', 'PARTIAL', 'UNPAID', 'REFUNDED'),
    allowNull: false,
    defaultValue: 'UNPAID',
  })
  status: PaymentStatus;

  @Column({
    type: DataType.ENUM('CASH', 'UPI', 'RAZORPAY'),
    allowNull: false,
  })
  method: PaymentMethod;

  @Column({ type: DataType.STRING, allowNull: true })
  transactionId: string;

  @Column({ type: DataType.STRING, allowNull: true })
  invoiceUrl: string;

  @Column({ type: DataType.STRING, allowNull: true })
  receiptUrl: string;

  @Column({ type: DataType.DATE, allowNull: true })
  dueDate: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  paidAt: Date;
}
