import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { StudentProfile } from './student-profile.model';
import { Seat } from './seat.model';
import { Shift } from './shift.model';

@Table({ tableName: 'seat_allocations' })
export class SeatAllocation extends Model<SeatAllocation> {
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

  @ForeignKey(() => Seat)
  @Column({ type: DataType.UUID, allowNull: false })
  seatId: string;

  @BelongsTo(() => Seat)
  seat: Seat;

  @ForeignKey(() => Shift)
  @Column({ type: DataType.UUID, allowNull: false })
  shiftId: string;

  @BelongsTo(() => Shift)
  shift: Shift;

  @Column({ type: DataType.DATE, allowNull: false })
  startDate: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  endDate: Date;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive: boolean;
}
