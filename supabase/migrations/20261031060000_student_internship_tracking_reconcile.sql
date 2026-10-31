CREATE TABLE IF NOT EXISTS public.student_internship_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  source_name text NOT NULL
    CHECK (length(trim(source_name)) BETWEEN 1 AND 100),
  external_id text NOT NULL
    CHECK (length(trim(external_id)) BETWEEN 1 AND 200),
  application_url text NOT NULL
    CHECK (application_url ~* '^https://'),
  listing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(listing_snapshot) = 'object'),
  is_saved boolean NOT NULL DEFAULT false,
  application_status text
    CHECK (application_status IS NULL OR application_status IN (
      'Interested', 'Applied', 'Interview', 'Selected', 'Rejected'
    )),
  application_date date,
  notes text NOT NULL DEFAULT ''
    CHECK (length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_internship_tracking_has_action
    CHECK (is_saved OR application_status IS NOT NULL),
  UNIQUE (user_id, source_name, external_id)
);

CREATE INDEX IF NOT EXISTS student_internship_tracking_user_updated_idx
  ON public.student_internship_tracking (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS student_internship_tracking_user_status_idx
  ON public.student_internship_tracking (user_id, application_status)
  WHERE application_status IS NOT NULL;

ALTER TABLE public.student_internship_tracking ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_internship_tracking'
      AND policyname = 'student_internship_tracking_manage_own'
  ) THEN
    CREATE POLICY student_internship_tracking_manage_own
      ON public.student_internship_tracking FOR ALL TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END;
$policy$;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.student_internship_tracking TO authenticated;

DO $trigger$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.student_internship_tracking'::regclass
      AND tgname = 'student_internship_tracking_set_updated_at'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER student_internship_tracking_set_updated_at
      BEFORE UPDATE ON public.student_internship_tracking
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$trigger$;
