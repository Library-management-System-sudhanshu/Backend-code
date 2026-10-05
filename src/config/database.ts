import { Sequelize, Model } from 'sequelize-typescript';
import * as models from '../models';
import dotenv from 'dotenv';
import { getDatabaseConfig } from './database-options';

dotenv.config();

const { url: databaseUrl, options } = getDatabaseConfig();
options.models = Object.values(models).filter(
  (val: any) => typeof val === 'function' && val.prototype instanceof Model
) as any;

if (databaseUrl) {
  const host = new URL(databaseUrl).hostname;
  console.log(`[Database] Configured to connect via DATABASE_URL to host: ${host}`);
} else {
  console.log(`[Database] Configured to connect via individual params to host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`);
}

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, options)
  : new Sequelize(options);

export default sequelize;
