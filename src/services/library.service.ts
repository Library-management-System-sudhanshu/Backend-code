import { Book } from '../models/book.model';
import { BookIssue, BookIssueStatus } from '../models/book-issue.model';
import { StudentProfile } from '../models/student-profile.model';
import { NotFoundException, BadRequestException } from '../middlewares/error.middleware';

export class LibraryService {
  async listBooks(workspaceId: string) {
    return Book.findAll({ where: { workspaceId } });
  }

  async createBook(workspaceId: string, data: any) {
    return Book.create({ ...data, workspaceId } as any);
  }

  async updateBook(id: string, data: any) {
    const book = await Book.findByPk(id);
    if (!book) throw new NotFoundException('Book not found');
    await book.update(data);
    return book;
  }

  async deleteBook(id: string) {
    const book = await Book.findByPk(id);
    if (!book) throw new NotFoundException('Book not found');
    await book.destroy();
    return { success: true };
  }

  async issueBook(workspaceId: string, data: any) {
    const { bookId, studentProfileId, issuedById, durationDays = 14 } = data;

    const book = await Book.findOne({ where: { id: bookId, workspaceId } });
    if (!book) throw new NotFoundException('Book not found in this workspace');
    if (book.quantity <= 0) throw new BadRequestException('Book currently out of stock');

    const student = await StudentProfile.findByPk(studentProfileId);
    if (!student) throw new NotFoundException('Student profile not found');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + durationDays);

    const issue = await BookIssue.create({
      bookId,
      studentProfileId,
      issuedById,
      dueDate,
      status: BookIssueStatus.ISSUED,
    } as any);

    await book.update({ quantity: book.quantity - 1 });
    return issue;
  }

  async returnBook(issueId: string) {
    const issue = await BookIssue.findByPk(issueId, { include: [Book] });
    if (!issue) throw new NotFoundException('Book issue log not found');
    if (issue.status !== 'ISSUED') throw new BadRequestException('Book already returned or processed');

    const returnedAt = new Date();
    let fineAmount = 0;

    if (returnedAt > issue.dueDate) {
      const diffTime = Math.abs(returnedAt.getTime() - issue.dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      fineAmount = diffDays * 10; // 10 INR fine per late day
    }

    await issue.update({
      returnedAt,
      status: BookIssueStatus.RETURNED,
      fineAmount,
    });

    const book = issue.book;
    await book.update({ quantity: book.quantity + 1 });

    return issue;
  }

  async getIssuedBooks(workspaceId: string) {
    return BookIssue.findAll({
      where: { status: 'ISSUED' },
      include: [
        {
          model: Book,
          where: { workspaceId },
        },
        { model: StudentProfile, include: [{ all: true }] },
      ],
    });
  }

  async getStudentIssuedBooks(studentProfileId: string) {
    return BookIssue.findAll({
      where: { studentProfileId },
      include: [
        { model: Book },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async requestBook(bookId: string, studentProfileId: string) {
    const book = await Book.findByPk(bookId);
    if (!book) throw new NotFoundException('Book not found');
    if (book.quantity <= 0) throw new BadRequestException('Book is currently out of stock');

    const issue = await BookIssue.create({
      bookId,
      studentProfileId,
      status: BookIssueStatus.REQUESTED,
    } as any);

    return issue;
  }
}
