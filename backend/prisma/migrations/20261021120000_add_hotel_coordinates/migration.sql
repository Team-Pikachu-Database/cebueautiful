ALTER TABLE public.sen
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sen_coordinates_pair_check'
      AND conrelid = 'public.sen'::regclass
  ) THEN
    ALTER TABLE public.sen
      ADD CONSTRAINT sen_coordinates_pair_check
      CHECK (
        (latitude IS NULL AND longitude IS NULL) OR
        (
          latitude IS NOT NULL AND
          longitude IS NOT NULL AND
          latitude BETWEEN -90 AND 90 AND
          longitude BETWEEN -180 AND 180
        )
      );
  END IF;
END
$migration$;
