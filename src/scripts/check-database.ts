import dotenv from 'dotenv';
import { Sequelize } from 'sequelize-typescript';
import { getDatabaseConfig } from '../config/database-options';

dotenv.config({ quiet: true });

async function checkDatabase() {
  const { url, options } = getDatabaseConfig();
  const database = url ? new Sequelize(url, options) : new Sequelize(options);
  try {
    await database.authenticate();
    console.log('Database connection successful. No tables or application data were changed.');
  } finally {
    await database.close();
  }
}

checkDatabase().catch((error: any) => {
  // Do not dump connection objects or credentials into the console.
  console.error(`Database check failed (${error.name || 'Error'}).`);
  console.error('Check DATABASE_URL, your database password, network access, and DB_SSL_CA_PATH. See README.md for setup and troubleshooting.');
  process.exitCode = 1;
});
