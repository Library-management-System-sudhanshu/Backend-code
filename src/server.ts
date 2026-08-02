import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import sequelize from './config/database';
import { CronService } from './services/cron.service';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Authenticate database connection
    await sequelize.authenticate();
    console.log('[Database] Connection has been established successfully.');

    // Pre-sync cleanup for Postgres enum default casting issue when altering string columns to enum
    // try {
    //   await sequelize.query(`
    //     DO $$
    //     BEGIN
    //       IF EXISTS (
    //         SELECT 1 FROM information_schema.columns 
    //         WHERE table_name = 'student_profiles' AND column_name = 'status' 
    //         AND data_type != 'USER-DEFINED'
    //       ) THEN
    //         ALTER TABLE "student_profiles" ALTER COLUMN "status" DROP DEFAULT;

    //         IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_student_profiles_status') THEN
    //           CREATE TYPE "public"."enum_student_profiles_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED');
    //         END IF;

    //         ALTER TABLE "student_profiles" 
    //           ALTER COLUMN "status" TYPE "public"."enum_student_profiles_status" 
    //           USING ("status"::text::"public"."enum_student_profiles_status");

    //         ALTER TABLE "student_profiles" 
    //           ALTER COLUMN "status" SET DEFAULT 'PENDING'::"public"."enum_student_profiles_status";
    //       END IF;
    //     END$$;
    //   `);
    // } catch (e) {
    //   console.warn('[Database Pre-Sync Warning]', e);
    // }

    await sequelize.sync();
    console.log('[Database] Models synchronized successfully.');

    // Initialize Cron Jobs
    CronService.init();

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
