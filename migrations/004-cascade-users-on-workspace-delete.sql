BEGIN;
SELECT pg_advisory_xact_lock(hashtext('studyflow_schema_migrations'));

-- 1. Update users_workspaceId_fkey from ON DELETE SET NULL to ON DELETE CASCADE
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'users'::regclass 
      AND contype = 'f' 
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'users'::regclass AND attname = 'workspaceId')]
  ) LOOP
    EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
  ALTER TABLE users ADD CONSTRAINT users_workspaceId_fkey
    FOREIGN KEY ("workspaceId") REFERENCES workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;
END $$;

-- 2. Clean up any orphaned non-super-admin users whose workspace no longer exists
DELETE FROM user_devices WHERE "userId" IN (
  SELECT u.id FROM users u
  WHERE u.role != 'SUPER_ADMIN'
    AND (u."workspaceId" IS NULL OR NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = u."workspaceId"))
    AND NOT EXISTS (SELECT 1 FROM workspace_memberships m WHERE m."userId" = u.id)
);

DELETE FROM users WHERE role != 'SUPER_ADMIN'
  AND ("workspaceId" IS NULL OR NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = "workspaceId"))
  AND NOT EXISTS (SELECT 1 FROM workspace_memberships WHERE "userId" = users.id);

INSERT INTO schema_migrations(name) VALUES ('004-cascade-users-on-workspace-delete') ON CONFLICT DO NOTHING;
COMMIT;
