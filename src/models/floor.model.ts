import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Branch } from './branch.model';
import { Room } from './room.model';

@Table({ tableName: 'floors' })
export class Floor extends Model<Floor> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Branch)
  @Column({ type: DataType.UUID, allowNull: false })
  branchId: string;

  @BelongsTo(() => Branch)
  branch: Branch;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @HasMany(() => Room)
  rooms: Room[];
}
