-- READ ONLY: catalog definitions only; no student/account rows, no DDL, no RPC execution.
-- Supabase SQL Editor -> New query -> Run -> Export result as JSON or CSV.
-- This is an inspection inventory, NOT a database backup or restore script.
-- Review function bodies for hardcoded secrets before sharing.
SELECT jsonb_pretty(jsonb_build_object(
  'tables', (SELECT jsonb_agg(jsonb_build_object('name', c.relname, 'rls_enabled', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity)) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p')),
  'columns', (SELECT jsonb_agg(to_jsonb(c)) FROM information_schema.columns c WHERE table_schema='public'),
  'constraints', (SELECT jsonb_agg(jsonb_build_object('table', c.conrelid::regclass::text, 'name', c.conname, 'definition', pg_get_constraintdef(c.oid))) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public'),
  'indexes', (SELECT jsonb_agg(to_jsonb(i)) FROM pg_indexes i WHERE schemaname='public'),
  'policies', (SELECT jsonb_agg(to_jsonb(p)) FROM pg_policies p WHERE schemaname='public'),
  'table_grants', (SELECT jsonb_agg(to_jsonb(g)) FROM information_schema.table_privileges g WHERE table_schema='public'),
  'routine_grants', (SELECT jsonb_agg(to_jsonb(g)) FROM information_schema.routine_privileges g WHERE routine_schema='public'),
  'functions', (SELECT jsonb_agg(jsonb_build_object('name', p.proname, 'arguments', pg_get_function_identity_arguments(p.oid), 'security_definer', p.prosecdef, 'config', p.proconfig, 'acl', p.proacl, 'definition', pg_get_functiondef(p.oid))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p')),
  'triggers', (SELECT jsonb_agg(jsonb_build_object('table', t.tgrelid::regclass::text, 'definition', pg_get_triggerdef(t.oid), 'enabled', t.tgenabled)) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal),
  'views', (SELECT jsonb_agg(to_jsonb(v)) FROM pg_views v WHERE schemaname='public'),
  'enums', (SELECT jsonb_agg(jsonb_build_object('type', t.typname, 'label', e.enumlabel, 'order', e.enumsortorder)) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public')
)) AS schema_inventory;
