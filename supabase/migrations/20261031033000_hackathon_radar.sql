CREATE TABLE public.hackathons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 180),
  organizer text NOT NULL CHECK (length(trim(organizer)) BETWEEN 1 AND 180),
  description text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  mode text NOT NULL CHECK (mode IN ('online', 'in_person', 'hybrid')),
  latitude double precision,
  longitude double precision,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  registration_deadline timestamptz,
  prize_pool text,
  technologies text[] NOT NULL DEFAULT '{}',
  registration_url text NOT NULL CHECK (registration_url ~* '^https://'),
  source_url text NOT NULL CHECK (source_url ~* '^https://'),
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hackathons_date_order_check CHECK (ends_at >= starts_at),
  CONSTRAINT hackathons_registration_deadline_check
    CHECK (registration_deadline IS NULL OR registration_deadline <= starts_at),
  CONSTRAINT hackathons_coordinates_pair_check
    CHECK ((latitude IS NULL AND longitude IS NULL) OR
      (latitude IS NOT NULL AND longitude IS NOT NULL AND
       latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)),
  CONSTRAINT hackathons_verified_metadata_check
    CHECK (verification_status <> 'verified' OR
      (verified_at IS NOT NULL AND verified_by IS NOT NULL))
);

CREATE UNIQUE INDEX hackathons_registration_url_unique
  ON public.hackathons (registration_url);
CREATE INDEX hackathons_public_start_idx
  ON public.hackathons (starts_at)
  WHERE is_published AND verification_status = 'verified';
CREATE INDEX hackathons_mode_location_idx
  ON public.hackathons (mode, location);

CREATE TABLE public.saved_hackathons (
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  hackathon_id uuid NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, hackathon_id)
);

CREATE INDEX saved_hackathons_hackathon_idx
  ON public.saved_hackathons (hackathon_id);

CREATE TABLE public.hackathon_team_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  hackathon_id uuid NOT NULL REFERENCES public.hackathons(id) ON DELETE CASCADE,
  preferred_role text NOT NULL CHECK (length(trim(preferred_role)) BETWEEN 1 AND 80),
  skills_snapshot text[] NOT NULL DEFAULT '{}'
    CHECK (cardinality(skills_snapshot) <= 30),
  share_with_students boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'looking'
    CHECK (status IN ('looking', 'matched', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, hackathon_id)
);

CREATE INDEX hackathon_team_requests_public_lookup_idx
  ON public.hackathon_team_requests (hackathon_id, created_at DESC)
  WHERE share_with_students AND status = 'looking';
CREATE INDEX hackathon_team_requests_user_idx
  ON public.hackathon_team_requests (user_id, updated_at DESC);

ALTER TABLE public.hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_team_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY hackathons_read_verified_published
  ON public.hackathons FOR SELECT TO anon, authenticated
  USING (is_published AND verification_status = 'verified');
CREATE POLICY hackathons_admin_manage
  ON public.hackathons FOR ALL TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY saved_hackathons_manage_own
  ON public.saved_hackathons FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY hackathon_team_requests_manage_own
  ON public.hackathon_team_requests FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT ON public.hackathons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hackathons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.saved_hackathons, public.hackathon_team_requests TO authenticated;

CREATE TRIGGER hackathons_set_updated_at
  BEFORE UPDATE ON public.hackathons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER hackathon_team_requests_set_updated_at
  BEFORE UPDATE ON public.hackathon_team_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.find_hackathon_team_requests(p_hackathon_id uuid)
RETURNS TABLE (
  request_id uuid,
  display_name text,
  preferred_role text,
  skills text[],
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.hackathons AS hackathon
    WHERE hackathon.id = p_hackathon_id
      AND hackathon.is_published
      AND hackathon.verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Verified hackathon not found.';
  END IF;

  RETURN QUERY
  SELECT request.id,
         profile.display_name,
         request.preferred_role,
         request.skills_snapshot,
         request.created_at
  FROM public.hackathon_team_requests AS request
  JOIN public.student_profiles AS profile
    ON profile.user_id = request.user_id
  WHERE request.hackathon_id = p_hackathon_id
    AND request.user_id <> auth.uid()
    AND request.share_with_students
    AND request.status = 'looking'
  ORDER BY request.created_at DESC
  LIMIT 50;
END;
$$;

REVOKE ALL ON FUNCTION public.find_hackathon_team_requests(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_hackathon_team_requests(uuid) TO authenticated;
