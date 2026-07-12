import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'saas_plans' })
export class SaaSPlan extends Model<SaaSPlan> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.DOUBLE, allowNull: false })
  price: number;

  @Column({ type: DataType.STRING, allowNull: true })
  description: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: -1 })
  maxSeats: number; // -1 means unlimited

  @Column({ type: DataType.JSON, allowNull: true, defaultValue: [] })
  features: string[];

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  isActive: boolean;
}
