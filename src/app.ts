import express from 'express';
import path from 'path';
import apiRouter from './routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
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

// Self-contained CORS middleware (allow local dev + production frontend)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://admin-frontend.getvoroa.com',
];

app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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
