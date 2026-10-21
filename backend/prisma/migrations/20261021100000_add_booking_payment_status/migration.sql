ALTER TABLE public.room_bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'room_bookings_payment_status_check'
      AND conrelid = 'public.room_bookings'::regclass
  ) THEN
    ALTER TABLE public.room_bookings
      ADD CONSTRAINT room_bookings_payment_status_check
      CHECK (
        (payment_status = 'pending' AND paid_at IS NULL) OR
        (payment_status = 'paid' AND paid_at IS NOT NULL)
      );
  END IF;
END
$migration$;
