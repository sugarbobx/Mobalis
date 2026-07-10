-- MOBALIS — email columns for repetiteurs/eleves (migration 0003)
-- Adds an email column to repetiteurs/eleves, matching what parents already
-- has. Needed so the admin "Comptes" page knows which address to create a
-- login for. Nullable + unique (multiple NULLs are allowed by Postgres
-- unique constraints, so existing rows without an email are unaffected).
alter table repetiteurs add column email text unique;
alter table eleves add column email text unique;
