CREATE TABLE IF NOT EXISTS public.hotel_room_inventory (
  hotel_id bigint PRIMARY KEY REFERENCES public.sen(id) ON DELETE CASCADE,
  total_rooms integer NOT NULL DEFAULT 5 CHECK (total_rooms > 0 AND total_rooms <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.hotel_room_inventory (hotel_id)
SELECT id FROM public.sen
ON CONFLICT (hotel_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.room_bookings (
  id uuid PRIMARY KEY,
  booking_reference text NOT NULL UNIQUE,
  hotel_id bigint NOT NULL
    REFERENCES public.hotel_room_inventory(hotel_id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  rooms integer NOT NULL CHECK (rooms > 0 AND rooms <= 10),
  total_price numeric(12, 2) NOT NULL CHECK (total_price >= 0),
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);

CREATE INDEX IF NOT EXISTS room_bookings_hotel_dates_idx
  ON public.room_bookings (hotel_id, check_in, check_out)
  WHERE cancelled_at IS NULL;

ALTER TABLE public.hotel_room_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.hotel_room_inventory, public.room_bookings FROM PUBLIC;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.hotel_room_inventory, public.room_bookings FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.hotel_room_inventory, public.room_bookings FROM authenticated;
  END IF;
END
$migration$;
