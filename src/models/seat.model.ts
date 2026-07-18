import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, Index } from 'sequelize-typescript';
import { Room } from './room.model';
import { SeatAllocation } from './seat-allocation.model';

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  BLOCKED = 'BLOCKED',
}

@Table({
  tableName: 'seats',
  paranoid: true,
  indexes: [
    { unique: true, fields: ['roomId', 'number'], where: { deletedAt: null } },
  ],
})
export class Seat extends Model<Seat> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Index
  @ForeignKey(() => Room)
  @Column({ type: DataType.UUID, allowNull: false })
  roomId: string;

  @BelongsTo(() => Room, { onDelete: 'CASCADE' })
  room: Room;

  @Column({ type: DataType.STRING, allowNull: false })
  number: string;

  @Column({
    type: DataType.ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'BLOCKED'),
    allowNull: false,
    defaultValue: 'AVAILABLE',
  })
  status: SeatStatus;

  @Column({ type: DataType.FLOAT, allowNull: true })
  x: number | null;

  @Column({ type: DataType.FLOAT, allowNull: true })
  y: number | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  rotation: number;

  @HasMany(() => SeatAllocation)
  allocations: SeatAllocation[];
}
