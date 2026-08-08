import express from 'express';
import path from 'path';
import apiRouter from './routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Sanitization middleware: strip empty string IDs to allow Sequelize defaultValue to take effect
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    if (req.body.id === '') {
      delete req.body.id;
    }
  }
  next();
});

// Simple self-contained CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Mount all API routes under /api
app.use('/api', apiRouter);

// Centralized error handler
app.use(errorHandler);

export default app;
