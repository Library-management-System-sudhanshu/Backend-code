import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { StudentProfile } from './student-profile.model';
import { User } from './user.model';
import { Workspace } from './workspace.model';
import { Branch } from './branch.model';

export enum ComplaintCategory {
  ELECTRICITY = 'ELECTRICITY',
  INTERNET = 'INTERNET',
  CLEANLINESS = 'CLEANLINESS',
  SEAT_ISSUE = 'SEAT_ISSUE',
  OTHER = 'OTHER',
}
export enum ComplaintStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}

@Table({ tableName: 'complaints', paranoid: true })
export class Complaint extends Model<Complaint> {
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
  @ForeignKey(() => Branch)
  @Column({ type: DataType.UUID, allowNull: false })
  branchId: string;

  @BelongsTo(() => Branch, { onDelete: 'CASCADE' })
  branch: Branch;

  @Index
  @ForeignKey(() => StudentProfile)
  @Column({ type: DataType.UUID, allowNull: false })
  studentProfileId: string;

  @BelongsTo(() => StudentProfile, { onDelete: 'CASCADE' })
  studentProfile: StudentProfile;

  @Column({
    type: DataType.ENUM('ELECTRICITY', 'INTERNET', 'CLEANLINESS', 'SEAT_ISSUE', 'OTHER'),
    allowNull: false,
  })
  category: ComplaintCategory;

  @Column({ type: DataType.TEXT, allowNull: false })
  description: string;

  @Column({
    type: DataType.ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED'),
    allowNull: false,
    defaultValue: 'OPEN',
  })
  status: ComplaintStatus;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  resolvedById: string;

  @BelongsTo(() => User, { foreignKey: 'resolvedById', onDelete: 'SET NULL' })
  resolvedBy: User;
}
