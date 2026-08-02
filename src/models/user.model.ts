import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasOne, HasMany, Index } from 'sequelize-typescript';
import { Workspace } from './workspace.model';
import { Branch } from './branch.model';
import { StudentProfile } from './student-profile.model';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  STUDENT = 'STUDENT',
}

@Table({ tableName: 'users', paranoid: true })
export class User extends Model<User> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  email: string;

  @Column({ type: DataType.STRING, allowNull: true })
  password: string;

  @Column({ type: DataType.STRING, allowNull: true })
  googleId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  mobile: string;

  @Column({
    type: DataType.ENUM('SUPER_ADMIN', 'OWNER', 'MANAGER', 'STAFF', 'STUDENT'),
    allowNull: false,
    defaultValue: 'STUDENT',
  })
  role: UserRole;

  @Column({ type: DataType.STRING, allowNull: true })
  avatar: string;

  @Index
  @ForeignKey(() => Workspace)
  @Column({ type: DataType.UUID, allowNull: true })
  workspaceId: string;

  @BelongsTo(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @Index
  @ForeignKey(() => Branch)
  @Column({ type: DataType.UUID, allowNull: true })
  branchId: string;

  @BelongsTo(() => Branch, { onDelete: 'SET NULL' })
  branch: Branch;

  @HasOne(() => StudentProfile)
  studentProfile: StudentProfile;
}
