ALTER TABLE public.hackathons
  ALTER COLUMN starts_at DROP NOT NULL,
  ALTER COLUMN ends_at DROP NOT NULL,
  ADD COLUMN source_name text NOT NULL DEFAULT 'SkillBridge administrator'
    CHECK (length(trim(source_name)) BETWEEN 1 AND 100),
  ADD COLUMN external_id text,
  ADD COLUMN country text,
  ADD COLUMN eligibility text,
  ADD COLUMN source_updated_at timestamptz,
  ADD CONSTRAINT hackathons_source_external_unique
    UNIQUE (source_name, external_id);

CREATE TABLE public.hackathon_feed_refreshes (
  source_name text PRIMARY KEY
    CHECK (length(trim(source_name)) BETWEEN 1 AND 100),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  event_count integer NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hackathon_feed_refreshes ENABLE ROW LEVEL SECURITY;

CREATE POLICY hackathon_feed_refreshes_read
  ON public.hackathon_feed_refreshes FOR SELECT TO anon, authenticated
  USING (true);

GRANT SELECT ON public.hackathon_feed_refreshes TO anon, authenticated;

CREATE TRIGGER hackathon_feed_refreshes_set_updated_at
  BEFORE UPDATE ON public.hackathon_feed_refreshes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
