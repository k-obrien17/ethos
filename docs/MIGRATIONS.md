# Supabase Migration Workflow

## Overview

Database migrations live in `supabase/migrations/` using numeric prefix naming (e.g., `00025_notification_types.sql`). Currently 24 migration files exist (00001 through 00025, with 00024 skipped).

Migrations are applied manually via the Supabase SQL Editor or CLI. There is no automated migration runner -- each migration must be reviewed and applied intentionally.

## Pre-deploy Checklist

1. **Write the migration** in `supabase/migrations/` following the `NNNNN_description.sql` naming convention. Use the next available number.
2. **Test locally** if a local Supabase instance is available (`supabase db reset` resets and replays all migrations).
3. **Apply to production** via the Supabase Dashboard: Dashboard > SQL Editor > paste the migration SQL > Run.
4. **Verify success** by checking the table structure and running a test query against the affected tables.
5. **Deploy the application code** that depends on the new schema. Always apply migrations BEFORE deploying code that uses them.

## Rollback Procedure

Each migration file should include a rollback strategy documented in a comment at the top of the file.

### By Change Type

| Change Type | Rollback Strategy |
|---|---|
| New table (`CREATE TABLE`) | `DROP TABLE IF EXISTS table_name;` |
| New column (`ALTER TABLE ADD COLUMN`) | `ALTER TABLE table_name DROP COLUMN column_name;` |
| New index (`CREATE INDEX`) | `DROP INDEX IF EXISTS index_name;` |
| New constraint (`ALTER TABLE ADD CONSTRAINT`) | `ALTER TABLE table_name DROP CONSTRAINT constraint_name;` |
| New RLS policy (`CREATE POLICY`) | `DROP POLICY IF EXISTS policy_name ON table_name;` |
| New function (`CREATE FUNCTION`) | `DROP FUNCTION IF EXISTS function_name;` |
| Destructive changes (DROP COLUMN, data transforms) | Restore from backup -- Supabase provides point-in-time recovery on Pro plan |

### Emergency Rollback Steps

1. Write the reverse SQL based on the rollback strategy above
2. Apply via Supabase SQL Editor (Dashboard > SQL Editor)
3. Redeploy the previous application version if the current code depends on the rolled-back schema

## Pending Migrations

The following migrations exist in `supabase/migrations/` but have not yet been applied to production Supabase:

- `00013_search_indexes.sql` -- Full-text search indexes for answer and topic discovery
- `00023_featured_expert.sql` -- Featured expert functionality and related schema
- `00025_notification_types.sql` -- New notification type definitions

These must be applied before deploying features that depend on them.

## Best Practices

- **Apply before deploy:** Always apply migrations BEFORE deploying code that depends on the new schema.
- **One concern per file:** Keep migrations small and focused on a single change.
- **Use guards:** Include `IF NOT EXISTS` / `IF EXISTS` guards where possible for idempotency.
- **Never modify applied migrations:** If a change is needed to an already-applied migration, create a new migration file instead.
- **Document rollback:** Add a comment at the top of each migration file describing how to reverse it.
- **Review before applying:** Migration SQL runs directly against production -- always review carefully before executing.
