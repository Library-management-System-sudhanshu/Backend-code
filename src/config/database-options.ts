import fs from 'node:fs';
import type { SequelizeOptions } from 'sequelize-typescript';

// Kept separate from model loading so configuration can be checked without a DB.
export function getDatabaseConfig(env: NodeJS.ProcessEnv = process.env): {
  url?: string;
  options: SequelizeOptions;
} {
  const url = env.DATABASE_URL?.trim() || undefined;
  if (url) {
    try {
      const parsed = new URL(url);
      if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname ||
          /YOUR_|\[|\]/i.test(url)) {
        throw new Error();
      }
      // Keep TLS settings in one place; URL parameters can override driver options.
      if (['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'ssl'].some(key => parsed.searchParams.has(key))) {
        throw new Error();
      }
    } catch {
      throw new Error('Set DATABASE_URL to your PostgreSQL connection URI in .env. Replace placeholders, URL-encode the password, and remove SSL query parameters; use DB_SSL and DB_SSL_CA_PATH instead.');
    }
  }

  const sslValue = env.DB_SSL?.trim();
  if (sslValue && !['true', 'false'].includes(sslValue)) {
    throw new Error('DB_SSL must be true or false.');
  }
  const sslEnabled = sslValue ? sslValue === 'true' : Boolean(url);
  const caPath = env.DB_SSL_CA_PATH?.trim();
  if (caPath && !sslEnabled) {
    throw new Error('DB_SSL_CA_PATH requires DB_SSL=true.');
  }

  const options: SequelizeOptions = {
    dialect: 'postgres',
    dialectModule: require('pg'),
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions: {
      connectionTimeoutMillis: 10000,
      ssl: sslEnabled ? {
        rejectUnauthorized: false,
        ...(caPath ? { ca: fs.readFileSync(caPath, 'utf8') } : {}),
      } : false,
    },
  };

  if (!url) {
    Object.assign(options, {
      host: env.DB_HOST || 'localhost',
      port: Number(env.DB_PORT || '5432'),
      username: env.DB_USERNAME || 'postgres',
      password: env.DB_PASSWORD || 'postgres',
      database: env.DB_DATABASE || 'studyflow',
    });
  }
  return { url, options };
}
