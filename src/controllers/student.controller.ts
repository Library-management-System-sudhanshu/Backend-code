import { Request, Response, NextFunction } from 'express';
import { StudentService } from '../services/student.service';

const studentService = new StudentService();

export class StudentController {
  // Public Admission Form
  async selfRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await studentService.registerStudent(req.body, true);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Authenticated endpoints below
  async listStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // req.query is already populated with workspaceId by tenantIsolation middleware if they are not SUPER_ADMIN
      const workspaceId = req.query.workspaceId as string;
      const result = await studentService.listStudents(workspaceId, req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getStudentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await studentService.getStudentById((req.params.id as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getStudentByUserId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await studentService.getStudentByUserId((req.params.userId as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async createStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // req.body already has workspaceId populated by tenantIsolation middleware
      const result = await studentService.registerStudent(req.body, false);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await studentService.updateStudent((req.params.id as string), req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await studentService.updateStatus((req.params.id as string), req.body.status);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await studentService.deleteStudent((req.params.id as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
