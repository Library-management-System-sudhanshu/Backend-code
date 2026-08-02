import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { StudentProfile } from './student-profile.model';
import { Seat } from './seat.model';
import { Shift } from './shift.model';
import { Workspace } from './workspace.model';

@Table({ tableName: 'seat_allocations', paranoid: true })
export class SeatAllocation extends Model<SeatAllocation> {
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
  @ForeignKey(() => StudentProfile)
  @Column({ type: DataType.UUID, allowNull: false })
  studentProfileId: string;

  @BelongsTo(() => StudentProfile, { onDelete: 'CASCADE' })
  studentProfile: StudentProfile;

  @Index
  @ForeignKey(() => Seat)
  @Column({ type: DataType.UUID, allowNull: false })
  seatId: string;

  @BelongsTo(() => Seat, { onDelete: 'CASCADE' })
  seat: Seat;

  @Index
  @ForeignKey(() => Shift)
  @Column({ type: DataType.UUID, allowNull: false })
  shiftId: string;

  @BelongsTo(() => Shift, { onDelete: 'CASCADE' })
  shift: Shift;

  @Column({ type: DataType.DATE, allowNull: false })
  startDate: Date;

  @Column({ type: DataType.DATE, allowNull: false })
  endDate: Date;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive: boolean;
}
