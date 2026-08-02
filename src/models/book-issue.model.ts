import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Index } from 'sequelize-typescript';
import { Book } from './book.model';
import { StudentProfile } from './student-profile.model';
import { User } from './user.model';
import { Workspace } from './workspace.model';

export enum BookIssueStatus {
  REQUESTED = 'REQUESTED',
  ISSUED = 'ISSUED',
  RETURNED = 'RETURNED',
  LOST = 'LOST',
}

@Table({ tableName: 'book_issues', paranoid: true })
export class BookIssue extends Model<BookIssue> {
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
  @ForeignKey(() => Book)
  @Column({ type: DataType.UUID, allowNull: false })
  bookId: string;

  @BelongsTo(() => Book, { onDelete: 'CASCADE' })
  book: Book;

  @Index
  @ForeignKey(() => StudentProfile)
  @Column({ type: DataType.UUID, allowNull: false })
  studentProfileId: string;

  @BelongsTo(() => StudentProfile, { onDelete: 'CASCADE' })
  studentProfile: StudentProfile;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  issuedById: string;

  @BelongsTo(() => User, { foreignKey: 'issuedById', onDelete: 'SET NULL' })
  issuedBy: User;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  issuedAt: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  dueDate: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  returnedAt: Date;

  @Column({
    type: DataType.ENUM('REQUESTED', 'ISSUED', 'RETURNED', 'LOST'),
    allowNull: false,
    defaultValue: 'REQUESTED',
  })
  status: BookIssueStatus;

  @Column({ type: DataType.DECIMAL(10, 2), defaultValue: 0.0 })
  fineAmount: number;
}
