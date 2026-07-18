/**
 * Migration script to apply all database architecture fixes.
 * 
 * This script:
 * 1. Drops deprecated columns (rawPassword, fcmToken) — already done
 * 2. Backfills workspaceId on existing rows by looking up through relationships
 * 3. Adds new NOT NULL columns with proper foreign keys
 * 4. Syncs the full schema (indexes, new tables, etc.)
 */
import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/database';

async function migrate() {
  const qi = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // ─── STEP 1: Add workspaceId as NULLABLE first to tables that need it ───
    const tablesToBackfill = [
      'student_profiles',
      'attendances',
      'payments',
      'seat_allocations',
      'complaints',
      'book_issues',
      'student_subscriptions',
    ];

    for (const table of tablesToBackfill) {
      try {
        const columns = await qi.describeTable(table);
        if (!columns['workspaceId']) {
          await qi.addColumn(table, 'workspaceId', {
            type: 'UUID',
            allowNull: true, // nullable first so we can backfill
          });
          console.log(`  ✅ Added workspaceId (nullable) to ${table}`);
        } else {
          console.log(`  ⏭️  workspaceId already exists on ${table}`);
        }
      } catch (e: any) {
        console.log(`  ⚠️  ${table}: ${e.message}`);
      }
    }

    // Add branchId to tables that need it
    const branchTables = ['attendances', 'payments', 'complaints'];
    for (const table of branchTables) {
      try {
        const columns = await qi.describeTable(table);
        if (!columns['branchId']) {
          await qi.addColumn(table, 'branchId', {
            type: 'UUID',
            allowNull: true,
          });
          console.log(`  ✅ Added branchId (nullable) to ${table}`);
        } else {
          console.log(`  ⏭️  branchId already exists on ${table}`);
        }
      } catch (e: any) {
        console.log(`  ⚠️  ${table}: ${e.message}`);
      }
    }

    // ─── STEP 2: Backfill workspaceId from related tables ───
    console.log('\n📦 Backfilling workspaceId on existing rows...');

    // student_profiles: get workspaceId from users table via userId
    await sequelize.query(`
      UPDATE student_profiles sp
      SET "workspaceId" = u."workspaceId"
      FROM users u
      WHERE sp."userId" = u.id
        AND sp."workspaceId" IS NULL
        AND u."workspaceId" IS NOT NULL
    `);
    console.log('  ✅ Backfilled student_profiles.workspaceId from users');

    // attendances: get workspaceId and branchId from student_profiles
    await sequelize.query(`
      UPDATE attendances a
      SET "workspaceId" = sp."workspaceId",
          "branchId" = sp."branchId"
      FROM student_profiles sp
      WHERE a."studentProfileId" = sp.id
        AND a."workspaceId" IS NULL
    `);
    console.log('  ✅ Backfilled attendances.workspaceId/branchId from student_profiles');

    // payments: get workspaceId and branchId from student_profiles
    await sequelize.query(`
      UPDATE payments p
      SET "workspaceId" = sp."workspaceId",
          "branchId" = sp."branchId"
      FROM student_profiles sp
      WHERE p."studentProfileId" = sp.id
        AND p."workspaceId" IS NULL
    `);
    console.log('  ✅ Backfilled payments.workspaceId/branchId from student_profiles');

    // seat_allocations: get workspaceId from student_profiles
    await sequelize.query(`
      UPDATE seat_allocations sa
      SET "workspaceId" = sp."workspaceId"
      FROM student_profiles sp
      WHERE sa."studentProfileId" = sp.id
        AND sa."workspaceId" IS NULL
    `);
    console.log('  ✅ Backfilled seat_allocations.workspaceId from student_profiles');

    // complaints: get workspaceId and branchId from student_profiles
    await sequelize.query(`
      UPDATE complaints c
      SET "workspaceId" = sp."workspaceId",
          "branchId" = sp."branchId"
      FROM student_profiles sp
      WHERE c."studentProfileId" = sp.id
        AND c."workspaceId" IS NULL
    `);
    console.log('  ✅ Backfilled complaints.workspaceId/branchId from student_profiles');

    // book_issues: get workspaceId from books table via bookId
    await sequelize.query(`
      UPDATE book_issues bi
      SET "workspaceId" = b."workspaceId"
      FROM books b
      WHERE bi."bookId" = b.id
        AND bi."workspaceId" IS NULL
    `);
    console.log('  ✅ Backfilled book_issues.workspaceId from books');

    // student_subscriptions: get workspaceId from student_profiles
    await sequelize.query(`
      UPDATE student_subscriptions ss
      SET "workspaceId" = sp."workspaceId"
      FROM student_profiles sp
      WHERE ss."studentProfileId" = sp.id
        AND ss."workspaceId" IS NULL
    `);
    console.log('  ✅ Backfilled student_subscriptions.workspaceId from student_profiles');

    // ─── STEP 3: Add deletedAt column to tables before making workspaceId NOT NULL ───
    // (sequelize.sync with paranoid:true needs deletedAt column to create partial unique indexes)
    console.log('\n📦 Adding deletedAt columns for soft deletes...');
    const paranoidTables = [
      'workspaces', 'users', 'branches', 'floors', 'rooms', 'seats', 'shifts',
      'subscription_plans', 'student_profiles', 'seat_allocations',
      'student_subscriptions', 'payments', 'attendances', 'books',
      'book_issues', 'complaints', 'notices', 'saas_plans', 'workspace_subscriptions',
    ];

    for (const table of paranoidTables) {
      try {
        const columns = await qi.describeTable(table);
        if (!columns['deletedAt']) {
          await qi.addColumn(table, 'deletedAt', {
            type: 'TIMESTAMP WITH TIME ZONE',
            allowNull: true,
          });
          console.log(`  ✅ Added deletedAt to ${table}`);
        } else {
          console.log(`  ⏭️  deletedAt already exists on ${table}`);
        }
      } catch (e: any) {
        console.log(`  ⚠️  ${table}: ${e.message}`);
      }
    }

    // ─── STEP 4: Convert STRING columns to ENUM before sync ───
    // PostgreSQL can't auto-cast VARCHAR with defaults to ENUM. We must do it manually.
    console.log('\n📦 Converting STRING columns to ENUMs...');

    // student_profiles.status: VARCHAR → ENUM
    try {
      await sequelize.query(`ALTER TABLE "student_profiles" ALTER COLUMN "status" DROP DEFAULT;`);
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_student_profiles_status') THEN
            CREATE TYPE "public"."enum_student_profiles_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED');
          END IF;
        END$$;
      `);
      await sequelize.query(`
        ALTER TABLE "student_profiles"
        ALTER COLUMN "status" TYPE "public"."enum_student_profiles_status"
        USING ("status"::"public"."enum_student_profiles_status");
      `);
      await sequelize.query(`ALTER TABLE "student_profiles" ALTER COLUMN "status" SET DEFAULT 'PENDING';`);
      console.log('  ✅ Converted student_profiles.status to ENUM');
    } catch (e: any) {
      console.log(`  ⚠️  student_profiles.status: ${e.message}`);
    }

    // student_profiles.gender: VARCHAR → ENUM
    try {
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_student_profiles_gender') THEN
            CREATE TYPE "public"."enum_student_profiles_gender" AS ENUM('MALE', 'FEMALE', 'OTHER');
          END IF;
        END$$;
      `);
      await sequelize.query(`
        ALTER TABLE "student_profiles"
        ALTER COLUMN "gender" TYPE "public"."enum_student_profiles_gender"
        USING ("gender"::"public"."enum_student_profiles_gender");
      `);
      console.log('  ✅ Converted student_profiles.gender to ENUM');
    } catch (e: any) {
      console.log(`  ⚠️  student_profiles.gender: ${e.message}`);
    }

    // whatsapp_logs.status: VARCHAR → ENUM
    try {
      await sequelize.query(`ALTER TABLE "whatsapp_logs" ALTER COLUMN "status" DROP DEFAULT;`);
      await sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_whatsapp_logs_status') THEN
            CREATE TYPE "public"."enum_whatsapp_logs_status" AS ENUM('SENT', 'FAILED', 'PENDING');
          END IF;
        END$$;
      `);
      await sequelize.query(`
        ALTER TABLE "whatsapp_logs"
        ALTER COLUMN "status" TYPE "public"."enum_whatsapp_logs_status"
        USING ("status"::"public"."enum_whatsapp_logs_status");
      `);
      await sequelize.query(`ALTER TABLE "whatsapp_logs" ALTER COLUMN "status" SET DEFAULT 'PENDING';`);
      console.log('  ✅ Converted whatsapp_logs.status to ENUM');
    } catch (e: any) {
      console.log(`  ⚠️  whatsapp_logs.status: ${e.message}`);
    }

    // ─── STEP 5: Full sync with alter to apply indexes, FK constraints, etc. ───
    console.log('\n📦 Running sequelize.sync({ alter: true })...');
    await sequelize.sync({ alter: true });
    console.log('✅ Schema fully synced!');

    console.log('\n🎉 Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
