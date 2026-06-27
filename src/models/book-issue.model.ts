import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Book } from './book.model';
import { StudentProfile } from './student-profile.model';
import { User } from './user.model';

export enum BookIssueStatus {
  REQUESTED = 'REQUESTED',
  ISSUED = 'ISSUED',
  RETURNED = 'RETURNED',
  LOST = 'LOST',
}

@Table({ tableName: 'book_issues' })
export class BookIssue extends Model<BookIssue> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Book)
  @Column({ type: DataType.UUID, allowNull: false })
  bookId: string;

  @BelongsTo(() => Book)
  book: Book;

  @ForeignKey(() => StudentProfile)
  @Column({ type: DataType.UUID, allowNull: false })
  studentProfileId: string;

  @BelongsTo(() => StudentProfile)
  studentProfile: StudentProfile;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  issuedById: string;

  @BelongsTo(() => User, 'issuedById')
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

  @Column({ type: DataType.DOUBLE, defaultValue: 0.0 })
  fineAmount: number;
}
