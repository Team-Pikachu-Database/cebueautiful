CREATE TABLE IF NOT EXISTS public.app_developer_invites (
  code_hash char(64) PRIMARY KEY
    CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS app_developer_invites_used_expires_idx
  ON public.app_developer_invites (used_at, expires_at);

ALTER TABLE public.app_developer_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_developer_invites FROM PUBLIC;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.app_developer_invites FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.app_developer_invites FROM authenticated;
  END IF;
END
$migration$;