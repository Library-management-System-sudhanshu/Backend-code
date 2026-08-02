import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, Index } from 'sequelize-typescript';
import { Workspace } from './workspace.model';
import { User } from './user.model';
import { Floor } from './floor.model';
import { StudentProfile } from './student-profile.model';

@Table({
  tableName: 'branches',
  paranoid: true,
  indexes: [
    { unique: true, fields: ['workspaceId', 'name'], where: { deletedAt: null } },
  ],
})
export class Branch extends Model<Branch> {
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
  name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  address: string;

  @HasMany(() => User)
  users: User[];

  @HasMany(() => Floor)
  floors: Floor[];

  @HasMany(() => StudentProfile)
  students: StudentProfile[];
}
