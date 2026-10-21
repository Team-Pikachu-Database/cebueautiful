ALTER TABLE public.room_bookings
ADD COLUMN IF NOT EXISTS user_id uuid
  REFERENCES public.app_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS room_bookings_user_created_at_idx
  ON public.room_bookings (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
