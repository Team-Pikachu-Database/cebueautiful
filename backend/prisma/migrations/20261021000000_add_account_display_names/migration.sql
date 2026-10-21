ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT '';
