import { Sequelize, Model } from 'sequelize-typescript';
import * as models from '../models';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      models: Object.values(models).filter(
        (val: any) => typeof val === 'function' && val.prototype instanceof Model
      ) as any,
      logging: false,
    })
  : new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'studyflow',
      models: Object.values(models).filter(
        (val: any) => typeof val === 'function' && val.prototype instanceof Model
      ) as any,
      logging: false,
    });

export default sequelize;
