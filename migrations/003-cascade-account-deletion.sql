BEGIN;
SELECT pg_advisory_xact_lock(hashtext('studyflow_schema_migrations'));

CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  "appliedAt" timestamptz NOT NULL DEFAULT now()
);

-- 1. workspace_memberships foreign keys -> ON DELETE CASCADE
DO $$ 
DECLARE r RECORD; 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_memberships') THEN
    FOR r IN (
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'workspace_memberships'::regclass 
        AND contype = 'f' 
        AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'workspace_memberships'::regclass AND attname = 'userId')]
    ) LOOP
      EXECUTE 'ALTER TABLE workspace_memberships DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
    ALTER TABLE workspace_memberships ADD CONSTRAINT workspace_memberships_userId_fkey
      FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

    FOR r IN (
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'workspace_memberships'::regclass 
        AND contype = 'f' 
        AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'workspace_memberships'::regclass AND attname = 'workspaceId')]
    ) LOOP
      EXECUTE 'ALTER TABLE workspace_memberships DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
    ALTER TABLE workspace_memberships ADD CONSTRAINT workspace_memberships_workspaceId_fkey
      FOREIGN KEY ("workspaceId") REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. workspace_access_grants foreign keys -> ON DELETE CASCADE / SET NULL
DO $$ 
DECLARE r RECORD; 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_access_grants') THEN
    FOR r IN (
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'workspace_access_grants'::regclass 
        AND contype = 'f' 
        AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'workspace_access_grants'::regclass AND attname = 'workspaceId')]
    ) LOOP
      EXECUTE 'ALTER TABLE workspace_access_grants DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
    ALTER TABLE workspace_access_grants ADD CONSTRAINT workspace_access_grants_workspaceId_fkey
      FOREIGN KEY ("workspaceId") REFERENCES workspaces(id) ON DELETE CASCADE;

    FOR r IN (
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'workspace_access_grants'::regclass 
        AND contype = 'f' 
        AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'workspace_access_grants'::regclass AND attname = 'grantedById')]
    ) LOOP
      EXECUTE 'ALTER TABLE workspace_access_grants DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
    ALTER TABLE workspace_access_grants ADD CONSTRAINT workspace_access_grants_grantedById_fkey
      FOREIGN KEY ("grantedById") REFERENCES users(id) ON DELETE CASCADE;

    FOR r IN (
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'workspace_access_grants'::regclass 
        AND contype = 'f' 
        AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'workspace_access_grants'::regclass AND attname = 'revokedById')]
    ) LOOP
      EXECUTE 'ALTER TABLE workspace_access_grants DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
    ALTER TABLE workspace_access_grants ADD CONSTRAINT workspace_access_grants_revokedById_fkey
      FOREIGN KEY ("revokedById") REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. saas_payments foreign key -> ON DELETE CASCADE
DO $$ 
DECLARE r RECORD; 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saas_payments') THEN
    FOR r IN (
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'saas_payments'::regclass 
        AND contype = 'f' 
        AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'saas_payments'::regclass AND attname = 'workspaceId')]
    ) LOOP
      EXECUTE 'ALTER TABLE saas_payments DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
    ALTER TABLE saas_payments ADD CONSTRAINT saas_payments_workspaceId_fkey
      FOREIGN KEY ("workspaceId") REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. payments studentSubscriptionId foreign key -> ON DELETE CASCADE
DO $$ 
DECLARE r RECORD; 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    FOR r IN (
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'payments'::regclass 
        AND contype = 'f' 
        AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'payments'::regclass AND attname = 'studentSubscriptionId')]
    ) LOOP
      EXECUTE 'ALTER TABLE payments DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
    ALTER TABLE payments ADD CONSTRAINT payments_student_subscription_fk
      FOREIGN KEY ("studentSubscriptionId") REFERENCES student_subscriptions(id) ON DELETE CASCADE;
  END IF;
END $$;

INSERT INTO schema_migrations(name) VALUES ('003-cascade-account-deletion') ON CONFLICT DO NOTHING;
COMMIT;
