import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, Index } from 'sequelize-typescript';
import { Workspace } from './workspace.model';
import { SeatAllocation } from './seat-allocation.model';

@Table({
  tableName: 'shifts',
  paranoid: true,
  indexes: [
    { unique: true, fields: ['workspaceId', 'name'], where: { deletedAt: null } },
  ],
})
export class Shift extends Model<Shift> {
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

  @Column({ type: DataType.STRING, allowNull: false })
  name: string; // e.g. "Morning"

  @Column({ type: DataType.STRING, allowNull: false })
  startTime: string; // e.g. "08:00"

  @Column({ type: DataType.STRING, allowNull: false })
  endTime: string; // e.g. "14:00"

  @Column({ type: DataType.INTEGER, allowNull: true })
  capacity: number | null;

  @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0 })
  price: number;

  // TODO: Normalize into a ShiftPricing table to avoid repeating groups (1NF violation)
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
  price3Months: number | null;

  // TODO: Normalize into a ShiftPricing table to avoid repeating groups (1NF violation)
  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
  price6Months: number | null;

  @HasMany(() => SeatAllocation)
  allocations: SeatAllocation[];
}
