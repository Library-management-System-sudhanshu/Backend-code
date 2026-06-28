import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Floor } from './floor.model';
import { Seat } from './seat.model';

@Table({ tableName: 'rooms' })
export class Room extends Model<Room> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Floor)
  @Column({ type: DataType.UUID, allowNull: false })
  floorId: string;

  @BelongsTo(() => Floor)
  floor: Floor;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  canvasWidth: number | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  canvasHeight: number | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  spacers: string | null;

  @HasMany(() => Seat)
  seats: Seat[];
}
