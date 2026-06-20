import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { StudentProfile } from './student-profile.model';
import { User } from './user.model';

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

@Table({ tableName: 'complaints' })
export class Complaint extends Model<Complaint> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => StudentProfile)
  @Column({ type: DataType.UUID, allowNull: false })
  studentProfileId: string;

  @BelongsTo(() => StudentProfile)
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

  @BelongsTo(() => User, 'resolvedById')
  resolvedBy: User;
}
