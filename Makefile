# KIT database commands.
# Put this at the root of the kit/ repo, next to package.json.
#
#   make db-reset    rebuild the LOCAL database from scratch (safe, fast)
#   make db-test     rebuild locally, then run both test suites
#   make db-push     apply migrations to the LINKED remote project
#   make db-seed     run seed.sql against the linked remote project
#   make db-status   show which migrations are applied where

.PHONY: db-start db-stop db-reset db-test db-push db-seed db-status db-diff db-types

# ── local ─────────────────────────────────────────────────────
# Requires Docker Desktop running.

db-start:
	supabase start

db-stop:
	supabase stop

# Wipes the local DB and replays every migration + seed.sql.
# This is the loop to use while iterating — it takes seconds and
# nothing is precious.
db-reset:
	supabase db reset

# Full check: rebuild, then run both suites against local.
# The shim is NOT needed here — local Supabase has the real
# auth and storage schemas.
db-test: db-reset
	@echo ""
	@echo "── functional suite ──"
	@psql "$$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '\"')" \
		-v ON_ERROR_STOP=1 -q -f db-tests/01_functional_test.sql
	@echo ""
	@echo "── RLS isolation suite ──"
	@psql "$$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '\"')" \
		-v ON_ERROR_STOP=1 -q -f db-tests/02_rls_test.sql


# ── remote ────────────────────────────────────────────────────
# Acts on whichever project `supabase link` pointed at.
# Check with `make db-status` before running these.

db-push:
	supabase db push

# Seeds are not run by db push — remote seeding is manual.
# Set DATABASE_URL first:
#   export DATABASE_URL='postgresql://postgres.[ref]:[pw]@...pooler.supabase.com:5432/postgres'
db-seed:
	@test -n "$$DATABASE_URL" || (echo "DATABASE_URL is not set — see the comment above this target." && exit 1)
	psql "$$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql

db-status:
	supabase migration list


# ── utilities ─────────────────────────────────────────────────

# After changing a table by hand in Studio, this writes the diff
# out as a new migration file so the change is version-controlled.
db-diff:
	@test -n "$(name)" || (echo "Usage: make db-diff name=add_something" && exit 1)
	supabase db diff -f $(name)

# Regenerate TypeScript types from the live schema into the app.
db-types:
	supabase gen types typescript --linked > src/lib/database.types.ts
	@echo "Wrote src/lib/database.types.ts"
