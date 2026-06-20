import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import sequelize from './config/database';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Authenticate database connection
    await sequelize.authenticate();
    console.log('[Database] Connection has been established successfully.');

    // Synchronize models (development mode)
    // synchronize: true in NestJS creates/updates tables automatically
    await sequelize.sync({ alter: true });
    console.log('[Database] Models synchronized successfully.');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`[StudyFlow Backend] Server running on http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('[Server] Unable to connect to the database or start server:', error);
    process.exit(1);
  }
}

startServer();
