import { Request, Response, NextFunction } from 'express';
import { LibraryService } from '../services/library.service';

const libraryService = new LibraryService();

export class LibraryController {
  async listBooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.query.workspaceId as string;
      const result = await libraryService.listBooks(workspaceId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async createBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req.body.workspaceId || req.query.workspaceId) as string;
      const result = await libraryService.createBook(workspaceId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await libraryService.updateBook((req.params.id as string), req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await libraryService.deleteBook((req.params.id as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async issueBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = (req.body.workspaceId || req.query.workspaceId) as string;
      const result = await libraryService.issueBook(workspaceId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async returnBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await libraryService.returnBook((req.params.issueId as string));
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getIssuedBooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.query.workspaceId as string;
      const result = await libraryService.getIssuedBooks(workspaceId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
