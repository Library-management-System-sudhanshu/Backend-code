import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Workspace } from './workspace.model';
import { SeatAllocation } from './seat-allocation.model';

@Table({ tableName: 'shifts' })
export class Shift extends Model<Shift> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Workspace)
  @Column({ type: DataType.UUID, allowNull: false })
  workspaceId: string;

  @BelongsTo(() => Workspace)
  workspace: Workspace;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string; // e.g. "Morning"

  @Column({ type: DataType.STRING, allowNull: false })
  startTime: string; // e.g. "08:00"

  @Column({ type: DataType.STRING, allowNull: false })
  endTime: string; // e.g. "14:00"

  @Column({ type: DataType.INTEGER, allowNull: true })
  capacity: number | null;

  @Column({ type: DataType.DOUBLE, defaultValue: 0 })
  price: number;

  @HasMany(() => SeatAllocation)
  allocations: SeatAllocation[];
}
