-- Run with npm run db:migrate after the original tables exist.
-- No existing payment amounts, balances, or subscription dates are rewritten.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('studyflow_schema_migrations'));
CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  "appliedAt" timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "orderId" varchar(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "totalAmount" numeric(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "discountAmount" numeric(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS "studentSubscriptionId" uuid;
UPDATE payments SET "orderId" = "transactionId"
WHERE "orderId" IS NULL AND method = 'RAZORPAY' AND "transactionId" LIKE 'order\_%' ESCAPE '\';
CREATE UNIQUE INDEX IF NOT EXISTS payments_order_id_unique ON payments ("orderId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_student_subscription_fk' AND conrelid = 'payments'::regclass) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_student_subscription_fk
      FOREIGN KEY ("studentSubscriptionId") REFERENCES student_subscriptions(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS saas_payments (
  id uuid PRIMARY KEY,
  "workspaceId" uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,
  "saasPlanId" uuid NOT NULL REFERENCES saas_plans(id) ON DELETE RESTRICT,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency varchar(255) NOT NULL DEFAULT 'INR',
  "durationDays" integer NOT NULL DEFAULT 30 CHECK ("durationDays" > 0),
  "orderId" varchar(255) UNIQUE,
  "paymentId" varchar(255) UNIQUE,
  status varchar(255) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
  "paidAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saas_payments_workspace_created ON saas_payments ("workspaceId", "createdAt");
INSERT INTO schema_migrations(name) VALUES ('001-payment-integrity') ON CONFLICT DO NOTHING;
COMMIT;
