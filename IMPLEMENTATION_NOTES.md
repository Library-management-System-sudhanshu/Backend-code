# Current handoff

Both implementation stages are in the working tree. The second-stage section below documents the delivered multi-library memberships, assigned-branch access, and subscription expiry/grace rules. Run `npm run db:migrate` before using the updated backend; the configured database has not been changed. Testing/build validation was stopped at the user's request.

# First implementation stage

This stage implements the approved authentication, record isolation, payment verification, and data-integrity fixes. The application code has changed; the configured database has not been migrated. Automated testing stopped at the user's request. The temporary local PostgreSQL instance was stopped without running application tests or migrations against it.

## Apply before running the updated backend

1. Preserve a copy of your development database.
2. Ensure the original application tables exist, then run `npm run db:migrate` against the intended development database. This applies `migrations/001-payment-integrity.sql` atomically. It adds payment purchase snapshots, provider order IDs, subscription links, and `saas_payments`. No old balances or subscription dates are reconstructed or overwritten. Duplicate legacy order IDs cause rollback and must be reconciled before retrying.
3. Configure a random `JWT_SECRET` of at least 32 characters, `GOOGLE_CLIENT_ID` if using Google login, and Razorpay test key/secret. Set `DB_SYNC=false` after initial schema creation. Remote PostgreSQL connections now verify TLS certificates; use `DB_SSL_CA_PATH` for your database provider's CA when necessary.
4. Sign in again. Old tokens without an access-token marker are intentionally rejected. Refresh tokens cannot be used as access tokens. The existing application still has no refresh exchange endpoint.
5. Create new SaaS payment orders before testing checkout; orders created before this change have no local purchase record and cannot safely activate subscriptions. Student pending orders with a retained provider order ID are backfilled by the migration; old completed orders without that ID cannot be re-verified.

## Changed behavior

- Workspace/branch/resource checks execute at the individual route, with route IDs available. Students are limited to their own enrollment records and payment lists. Managers/staff are restricted to their existing assigned branch across student, payment, attendance, complaint, booking, report, alarm, and broadcast operations.
- Changes to workspace-wide catalogs and notices are owner-only because those tables do not have branch ownership. Workspace-wide WhatsApp logs are also owner-only. Custom templates remain temporary memory but are now isolated per workspace.
- Fixed OTP login is disabled with a 503 response until an SMS verification provider is integrated. Google mock tokens are rejected; real tokens are checked for intended audience, issuer, expiry, and verified email. Password hashes and Google identifiers are redacted from JSON responses.
- Students cannot record cash, assign discounts, or pay a small fraction of a plan to grant themselves a subscription. Staff may still record approved partial collections. Razorpay settlement requires matching stored order, valid signature, captured provider payment, currency, and amount. Failed provider calls no longer produce mock orders. Repeated successful verification does not extend a subscription twice.
- Student and platform payments use separate records. Purchased student price/discount and the created subscription are saved on the payment. Outstanding partial balances are added when a new payment is settled. Manual cash/UPI confirmation activates the subscription just as online settlement does. Collection reports count both paid and partially paid collections.
- Owner setup, student admission/update/dues/deletion, book issue/return, payment settlement, and seat allocation/transfer/vacating use transactions. Balance and inventory operations lock the affected records; bookings serialize per workspace and compare both dates and shift times. Clubbed-shift bookings are atomic.
- Attendance, complaints, and book issues now receive required ownership fields. Public student admission creates a pending enrollment and cannot record money or activate a plan. Admin-created student accounts without a supplied password receive an unguessable generated password instead of a shared default; a real account invitation/reset flow is still needed.
- Vacating as a student preserves other students' allocations. Admission payments link to their exact subscription. Editing allocation dates no longer edits an unrelated latest subscription; explicit allocation-to-subscription linkage remains a later schema change.
- Workspace DELETE now disables the workspace while preserving its records; the super admin can re-enable it through the existing update route. Student deletion releases allocations and preserves historical payment rows.
- Startup schema synchronization requires explicit `DB_SYNC=true`. The new migration does not use `sync({ alter: true })`.

## First-stage remaining work (updated by second stage below)

The following were pending at the end of the first stage; the second-stage section below identifies what is now implemented:

- Global identity with multiple workspace memberships, workspace selection, student claim/invitation flow, and multiple assigned branches. Current authorization still uses the existing single `users.workspaceId` and `users.branchId` fields.
- Separate current SaaS entitlement enforcement for each workspace: 24-hour read-only access after expiry, followed by blocked library access, with super-admin-only read-only/full-access grace overrides and an audit trail. Existing workspace suspension checks remain active, but subscription expiry is not yet enforced.
- Student invoice/collection allocation records, full historical reconciliation, normalized shift pricing, persistent WhatsApp templates, audit logs, and broader database constraints.
- Consistent background expiry processing, branch history for moved students, and real dashboard trend/uptime metrics.

## Integration references used

- [Razorpay checkout verification](https://razorpay.com/docs/server-integration/python/test-app/): verify with the server's order ID and check payment capture before granting entitlement.
- [Google backend token validation](https://developers.google.com/identity/sign-in/web/backend-auth): validate audience/issuer/expiry and avoid unverified account linking. This stage retains the tokeninfo-based flow; adopting the official Google verification client is a later integration improvement.

# Second stage: memberships and subscription access

This section supersedes the first stage's pending membership/expiry items. No tests or build checks were run for this stage at the user's request, and no migrations were applied to the configured database.

## New tables and changed ownership

- `workspace_memberships`: one identity can be an owner/student/staff member in several independent libraries. Each membership has its own role and active/inactive state. This initial design permits one role per person per library.
- `membership_branches`: managers and staff have explicit branch assignments. Requests use one selected assigned branch; omitting the branch header selects the first assignment. Staff reports never automatically aggregate unassigned branches.
- `workspace_access_grants`: super-admin-only grace grants with read-only/full mode, deadline, reason, granting admin, and revocation history. Full grace does not bypass ordinary membership or branch checks.
- Student contact/name/avatar details are copied into library-specific profile fields. Owners edit their own enrollment record rather than another person's shared login. Removing an enrollment revokes only its student membership; the shared account and its other libraries remain intact.
- The migration replaces global student user-ID uniqueness with one active profile per user/library. It backfills memberships from existing users/profiles and assigned branches from existing staff branch IDs. Missing branch assignments must be corrected by the owner or super admin.
- Each workspace has one current subscription. If old data contains duplicates, migration 002 keeps the latest by creation time/ID as current and soft-deletes the older rows, retaining their history. Review ambiguous legacy duplicates before migration. New SaaS plans have an explicit duration in days, and seat creation enforces the current plan's seat limit.

## Frontend/API changes

All paths below use `/api` as the prefix.

| Request | Purpose |
|---|---|
| `GET /auth/memberships` | List the signed-in person's active memberships and assigned branches |
| `POST /auth/select-workspace` with `{ "workspaceId": "..." }` | Receive tokens and user context for a selected library |
| Header `X-Workspace-Id` | Select an authorized library for a request without changing the global user record |
| Header `X-Branch-Id` | Select one assigned branch for staff/manager operations |
| `POST /auth/setup-workspace` | Create another independently subscribed library for the signed-in identity |
| `POST /students/join` with `{ "workspaceId": "...", "branchId": "..." }` | Authenticated student joins another library with a pending enrollment, using their existing identity |
| `GET /workspaces/:workspaceId/memberships` | Owner/super admin lists this library's members |
| `POST /workspaces/:workspaceId/memberships` | Owner/super admin assigns manager/staff role and branch access |
| `GET /workspaces/:id/saas-subscription` | Includes computed `access.mode`, `access.reason`, and `access.until` |
| `POST /workspaces/:id/grace` | Super admin grants read-only or full access until a specified deadline |
| `GET /workspaces/:id/grace` | Super admin reads grant history |
| `DELETE /workspaces/:id/grace` | Super admin revokes the current grace grant |

Staff assignment body:

```json
{
  "email": "staff@example.com",
  "role": "MANAGER",
  "branchIds": ["branch-uuid"],
  "status": "ACTIVE"
}
```

A new staff identity additionally requires `name` and a password of at least 10 characters. Existing identities retain their passwords. This endpoint cannot replace owner/student memberships with staff memberships. Use `status: "INACTIVE"` to revoke staff access.

Grace body:

```json
{
  "mode": "READ_ONLY",
  "expiresAt": "2026-10-12T12:00:00+05:30",
  "reason": "Owner requested a payment extension"
}
```

Use `FULL` to restore normal operations during grace. Only the super admin may select or change that mode. A new grant revokes the previous one while retaining its history. Successful SaaS renewal ends existing grace overrides. Manual workspace suspension takes precedence and requires the super admin to re-enable the workspace.

Existing students must sign in and use `/students/join` to enroll under another owner; an owner cannot link an existing shared identity merely by submitting its email and setting a new password. Owners can approve the pending enrollment through the existing student status endpoint.

## Expiry behavior

- Before expiry: full operations.
- From expiry until exactly 24 elapsed hours later: ordinary library reads allowed, writes denied.
- At the 24-hour boundary: ordinary library reads and writes denied.
- Authentication, membership selection, and owner SaaS billing/recovery remain available. Subscription expiry affects only that workspace.
- An active admin grant replaces the expiry access mode until its deadline. After the grant expires or is revoked, access returns to the original subscription timeline, without another automatic 24-hour window.
- A library with no subscription/valid expiry is blocked until its owner starts the one-time trial or purchases a subscription, or a super admin grants grace. New onboarding consistently creates a 7-day trial.
- Request-time dates enforce access even if cron has not updated the subscription status. Automated WhatsApp reminders skip libraries without full access. Ordinary seat-map/settings reads no longer perform business writes.

## Migration

`npm run db:migrate` now runs migrations 001 and 002 in order. Each file is atomic; if 002 fails, 001 may already be committed. The migrations are designed for rerunning after reconciliation. Do not describe the entire two-file batch as one transaction.

Remaining follow-up design work: invoice-level collection allocations and reconciliation, explicit seat-allocation/subscription linkage, normalized shift pricing, persisted WhatsApp templates, general audit events beyond grace history, and complete background expiry/reporting cleanup. These are separate from the delivered membership and access policies.
