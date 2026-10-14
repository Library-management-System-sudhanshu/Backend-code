BEGIN;
SELECT pg_advisory_xact_lock(hashtext('studyflow_schema_migrations'));
ALTER TABLE saas_plans ADD COLUMN IF NOT EXISTS "durationDays" integer NOT NULL DEFAULT 30;
CREATE TABLE IF NOT EXISTS workspace_memberships (
  id uuid PRIMARY KEY,
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "workspaceId" uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  role varchar(255) NOT NULL CHECK (role IN ('OWNER','MANAGER','STAFF','STUDENT')),
  status varchar(255) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("userId", "workspaceId")
);
CREATE TABLE IF NOT EXISTS membership_branches (
  id uuid PRIMARY KEY,
  "membershipId" uuid NOT NULL REFERENCES workspace_memberships(id) ON DELETE CASCADE,
  "branchId" uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("membershipId", "branchId")
);
CREATE TABLE IF NOT EXISTS workspace_access_grants (
  id uuid PRIMARY KEY,
  "workspaceId" uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  "grantedById" uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  mode varchar(255) NOT NULL CHECK (mode IN ('READ_ONLY','FULL')),
  "expiresAt" timestamptz NOT NULL,
  reason text NOT NULL,
  "revokedAt" timestamptz,
  "revokedById" uuid REFERENCES users(id) ON DELETE RESTRICT,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspace_access_grants_workspace_created ON workspace_access_grants ("workspaceId", "createdAt");
ALTER TABLE workspace_memberships ALTER COLUMN "createdAt" SET DEFAULT now();
ALTER TABLE workspace_memberships ALTER COLUMN "updatedAt" SET DEFAULT now();
ALTER TABLE membership_branches ALTER COLUMN "createdAt" SET DEFAULT now();
ALTER TABLE membership_branches ALTER COLUMN "updatedAt" SET DEFAULT now();
INSERT INTO workspace_memberships(id,"userId","workspaceId",role,status,"createdAt","updatedAt")
SELECT md5('membership:' || u.id::text || ':' || u."workspaceId"::text)::uuid,
  u.id,u."workspaceId",u.role::text,'ACTIVE',now(),now()
FROM users u JOIN workspaces w ON w.id=u."workspaceId"
WHERE u."deletedAt" IS NULL AND w."deletedAt" IS NULL AND u.role::text <> 'SUPER_ADMIN'
ON CONFLICT ("userId","workspaceId") DO NOTHING;
INSERT INTO workspace_memberships(id,"userId","workspaceId",role,status,"createdAt","updatedAt")
SELECT md5('membership:' || s."userId"::text || ':' || s."workspaceId"::text)::uuid,
  s."userId",s."workspaceId",'STUDENT','ACTIVE',now(),now()
FROM student_profiles s JOIN users u ON u.id=s."userId" JOIN workspaces w ON w.id=s."workspaceId"
WHERE s."deletedAt" IS NULL AND u."deletedAt" IS NULL AND w."deletedAt" IS NULL
  AND u.role::text <> 'SUPER_ADMIN'
ON CONFLICT ("userId","workspaceId") DO NOTHING;
INSERT INTO membership_branches(id,"membershipId","branchId","createdAt","updatedAt")
SELECT md5('branch:' || m.id::text || ':' || b.id::text)::uuid,m.id,b.id,now(),now()
FROM workspace_memberships m JOIN users u ON u.id=m."userId"
JOIN branches b ON b.id=u."branchId" AND b."workspaceId"=m."workspaceId"
WHERE m.role IN ('MANAGER','STAFF') AND b."deletedAt" IS NULL
ON CONFLICT ("membershipId","branchId") DO NOTHING;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS "displayName" varchar(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS "contactEmail" varchar(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS "contactMobile" varchar(255);
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS avatar varchar(255);
-- Only initial backfill: later library-specific edits must not be overwritten on reruns.
UPDATE student_profiles s SET "displayName"=u.name,"contactEmail"=u.email,"contactMobile"=u.mobile,avatar=u.avatar
FROM users u WHERE s."userId"=u.id AND s."displayName" IS NULL;
DO $$ DECLARE item record; user_att smallint; BEGIN
  SELECT attnum INTO user_att FROM pg_attribute WHERE attrelid='student_profiles'::regclass AND attname='userId';
  FOR item IN SELECT conname FROM pg_constraint WHERE conrelid='student_profiles'::regclass
    AND contype='u' AND conkey=ARRAY[user_att] LOOP
    EXECUTE format('ALTER TABLE student_profiles DROP CONSTRAINT %I',item.conname);
  END LOOP;
  FOR item IN SELECT i.indexrelid::regclass AS index_name FROM pg_index i
    WHERE i.indrelid='student_profiles'::regclass AND i.indisunique AND NOT i.indisprimary
    AND i.indnatts=1 AND i.indkey[0]=user_att
    AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid=i.indexrelid) LOOP
    EXECUTE format('DROP INDEX %s',item.index_name);
  END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_user_workspace_active
  ON student_profiles("userId","workspaceId") WHERE "deletedAt" IS NULL;
-- Consolidate the legacy current-subscription representation deterministically.
-- Preserve duplicate historical rows using the table's existing soft-delete column.
WITH ranked AS (
  SELECT id,row_number() OVER (PARTITION BY "workspaceId" ORDER BY "createdAt" DESC,id DESC) AS n
  FROM workspace_subscriptions WHERE "deletedAt" IS NULL
)
UPDATE workspace_subscriptions s SET "deletedAt"=now(),"updatedAt"=now()
FROM ranked r WHERE s.id=r.id AND r.n>1;
CREATE UNIQUE INDEX IF NOT EXISTS workspace_subscriptions_current
  ON workspace_subscriptions("workspaceId") WHERE "deletedAt" IS NULL;
INSERT INTO schema_migrations(name) VALUES ('002-memberships-and-access') ON CONFLICT DO NOTHING;
COMMIT;
