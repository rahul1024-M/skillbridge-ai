CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  location text,
  introduction text,
  photo_path text,
  public_enabled boolean NOT NULL DEFAULT false,
  public_slug text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_profiles_public_slug_check
    CHECK (public_slug IS NULL OR public_slug ~ '^[a-zA-Z0-9-]{3,60}$'),
  CONSTRAINT student_profiles_public_consent_check
    CHECK (public_enabled = false OR public_slug IS NOT NULL)
);

CREATE TABLE public.education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  institution text,
  degree text,
  department text,
  academic_year text,
  graduation_year integer CHECK (graduation_year BETWEEN 1950 AND 2200),
  cgpa numeric(4, 2) CHECK (cgpa BETWEEN 0 AND 10),
  academic_information text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  proficiency text NOT NULL DEFAULT 'Beginner'
    CHECK (proficiency IN ('Beginner', 'Intermediate', 'Advanced')),
  years_experience numeric(4, 1) CHECK (years_experience BETWEEN 0 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT skills_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE UNIQUE INDEX skills_user_name_unique
  ON public.skills (user_id, lower(name));

CREATE TABLE public.career_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  target_role text,
  preferred_domain text,
  goals text,
  preferred_location text,
  work_mode text CHECK (work_mode IS NULL OR work_mode IN ('Remote', 'Hybrid', 'Onsite', 'Any')),
  internship_preferences text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  technologies text[] NOT NULL DEFAULT '{}',
  repository_url text,
  live_url text,
  status text NOT NULL DEFAULT 'In progress'
    CHECK (status IN ('Planned', 'In progress', 'Completed', 'Archived')),
  contribution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_title_not_blank CHECK (length(trim(title)) > 0)
);

CREATE TABLE public.certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  name text NOT NULL,
  issuer text,
  issued_on date,
  credential_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT certifications_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE TABLE public.experience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  organization text NOT NULL,
  role text NOT NULL,
  started_on date,
  ended_on date,
  responsibilities text,
  skills_used text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT experience_dates_check CHECK (ended_on IS NULL OR started_on IS NULL OR ended_on >= started_on)
);

CREATE TABLE public.student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_links_url_check CHECK (url ~* '^https?://'),
  CONSTRAINT student_links_label_not_blank CHECK (length(trim(label)) > 0)
);

CREATE TABLE public.learning_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  target_role text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  generated_by text NOT NULL DEFAULT 'student' CHECK (generated_by IN ('student', 'ai', 'admin')),
  source_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

CREATE TABLE public.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  resources jsonb NOT NULL DEFAULT '[]'::jsonb,
  assignment text,
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes >= 0),
  position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  FOREIGN KEY (roadmap_id, user_id)
    REFERENCES public.learning_roadmaps(id, user_id) ON DELETE CASCADE
);

CREATE TABLE public.student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  roadmap_item_id uuid,
  activity_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (roadmap_item_id, user_id)
    REFERENCES public.roadmap_items(id, user_id) ON DELETE CASCADE
);

CREATE TABLE public.opportunity_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  source_url text NOT NULL CHECK (source_url ~* '^https?://'),
  terms_url text,
  active boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.opportunity_sources(id) ON DELETE RESTRICT,
  external_id text,
  kind text NOT NULL CHECK (kind IN ('internship', 'hackathon', 'course', 'job')),
  title text NOT NULL,
  organization text,
  description text,
  location text,
  eligibility text,
  application_url text NOT NULL CHECK (application_url ~* '^https?://'),
  starts_at timestamptz,
  ends_at timestamptz,
  deadline_at timestamptz,
  cost_amount numeric(10, 2),
  cost_currency text,
  skills text[] NOT NULL DEFAULT '{}',
  source_published_at timestamptz,
  verified_at timestamptz NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_id),
  CONSTRAINT opportunities_date_order_check
    CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE TABLE public.recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('skill', 'roadmap', 'project', 'course', 'internship', 'hackathon', 'next_action')),
  title text NOT NULL,
  explanation text NOT NULL,
  relevant_skills text[] NOT NULL DEFAULT '{}',
  missing_requirements text[] NOT NULL DEFAULT '{}',
  match_score numeric(5, 2) CHECK (match_score BETWEEN 0 AND 100),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.proof_of_work_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  repository_url text NOT NULL CHECK (repository_url ~* '^https://github\.com/[^/]+/[^/]+/?$'),
  repository_full_name text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'reviewed', 'failed')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

CREATE TABLE public.proof_of_work_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  repository_url text NOT NULL CHECK (repository_url ~* '^https://github\.com/[^/]+/[^/]+/?$'),
  commit_sha text,
  files_reviewed jsonb NOT NULL DEFAULT '[]'::jsonb,
  rubric jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer CHECK (score BETWEEN 0 AND 100),
  status text NOT NULL CHECK (status IN ('Evidence reviewed', 'Needs more evidence', 'Unable to verify')),
  summary text,
  strengths text[] NOT NULL DEFAULT '{}',
  improvements text[] NOT NULL DEFAULT '{}',
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  limitations text[] NOT NULL DEFAULT '{}',
  audited_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (submission_id, user_id)
    REFERENCES public.proof_of_work_submissions(id, user_id) ON DELETE CASCADE
);

CREATE INDEX education_user_idx ON public.education(user_id);
CREATE INDEX skills_user_idx ON public.skills(user_id);
CREATE INDEX projects_user_idx ON public.projects(user_id);
CREATE INDEX certifications_user_idx ON public.certifications(user_id);
CREATE INDEX experience_user_idx ON public.experience(user_id);
CREATE INDEX student_links_user_idx ON public.student_links(user_id);
CREATE INDEX roadmaps_user_status_idx ON public.learning_roadmaps(user_id, status);
CREATE INDEX roadmap_items_user_roadmap_idx ON public.roadmap_items(user_id, roadmap_id);
CREATE INDEX progress_user_occurred_idx ON public.student_progress(user_id, occurred_at DESC);
CREATE INDEX opportunities_kind_deadline_idx ON public.opportunities(kind, deadline_at);
CREATE INDEX opportunities_verified_idx ON public.opportunities(verified_at DESC, expires_at);
CREATE INDEX recommendations_user_generated_idx ON public.recommendations(user_id, generated_at DESC);
CREATE INDEX proof_submissions_user_submitted_idx ON public.proof_of_work_submissions(user_id, submitted_at DESC);
CREATE INDEX proof_audits_submission_audited_idx ON public.proof_of_work_audits(submission_id, audited_at DESC);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'student_profiles', 'education', 'skills', 'career_preferences',
    'projects', 'certifications', 'experience', 'student_links',
    'learning_roadmaps', 'roadmap_items', 'student_progress',
    'opportunity_sources', 'opportunities', 'recommendations',
    'proof_of_work_submissions', 'proof_of_work_audits'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END;
$$;

CREATE POLICY student_profiles_read_own
  ON public.student_profiles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY student_profiles_manage_own
  ON public.student_profiles FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY student_profiles_read_consented
  ON public.student_profiles FOR SELECT TO anon
  USING (public_enabled = true AND public_slug IS NOT NULL);
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'education', 'skills', 'career_preferences', 'projects', 'certifications',
    'experience', 'student_links', 'learning_roadmaps', 'roadmap_items',
    'student_progress', 'recommendations', 'proof_of_work_submissions',
    'proof_of_work_audits'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()))',
      table_name || '_manage_own', table_name
    );
  END LOOP;
END;
$$;

CREATE POLICY opportunity_sources_read_active
  ON public.opportunity_sources FOR SELECT TO anon, authenticated
  USING (active = true);
CREATE POLICY opportunities_read_verified
  ON public.opportunities FOR SELECT TO anon, authenticated
  USING (verified_at IS NOT NULL AND (expires_at IS NULL OR expires_at > now()));

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.student_profiles, public.education, public.skills,
  public.career_preferences, public.projects, public.certifications,
  public.experience, public.student_links, public.learning_roadmaps,
  public.roadmap_items, public.student_progress, public.recommendations,
  public.proof_of_work_submissions, public.proof_of_work_audits
  TO authenticated;
GRANT SELECT ON public.opportunity_sources, public.opportunities TO anon, authenticated;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'student_profiles', 'education', 'skills', 'career_preferences',
    'projects', 'certifications', 'experience', 'student_links',
    'learning_roadmaps', 'roadmap_items', 'opportunity_sources',
    'opportunities', 'proof_of_work_submissions'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      table_name || '_set_updated_at', table_name
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_student_profile_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.student_profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_create_student_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_student_profile_for_new_user();

REVOKE ALL ON FUNCTION public.create_student_profile_for_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_student_profile(p_profile jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  INSERT INTO public.student_profiles (
    user_id, display_name, email, phone, location, introduction, photo_path,
    public_enabled, public_slug
  )
  VALUES (
    current_user_id,
    COALESCE(p_profile ->> 'name', ''),
    NULLIF(p_profile ->> 'email', ''),
    NULLIF(p_profile ->> 'phone', ''),
    NULLIF(p_profile ->> 'location', ''),
    NULLIF(p_profile ->> 'bio', ''),
    NULLIF(p_profile ->> 'photoUrl', ''),
    COALESCE((p_profile ->> 'publicEnabled')::boolean, false),
    NULLIF(p_profile ->> 'publicSlug', '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    location = EXCLUDED.location,
    introduction = EXCLUDED.introduction,
    photo_path = EXCLUDED.photo_path,
    public_enabled = EXCLUDED.public_enabled,
    public_slug = EXCLUDED.public_slug;

  INSERT INTO public.education (
    user_id, institution, degree, department, academic_year,
    graduation_year, cgpa, academic_information
  )
  VALUES (
    current_user_id,
    NULLIF(p_profile ->> 'college', ''),
    NULLIF(p_profile ->> 'degree', ''),
    NULLIF(p_profile ->> 'branch', ''),
    NULLIF(p_profile ->> 'year', ''),
    NULLIF(p_profile ->> 'graduationYear', '')::integer,
    NULLIF(p_profile ->> 'cgpa', '')::numeric,
    NULLIF(p_profile ->> 'academicInfo', '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    institution = EXCLUDED.institution,
    degree = EXCLUDED.degree,
    department = EXCLUDED.department,
    academic_year = EXCLUDED.academic_year,
    graduation_year = EXCLUDED.graduation_year,
    cgpa = EXCLUDED.cgpa,
    academic_information = EXCLUDED.academic_information;

  DELETE FROM public.skills WHERE user_id = current_user_id;
  INSERT INTO public.skills (id, user_id, name, category, proficiency, years_experience)
  SELECT
    COALESCE(entry.id, gen_random_uuid()),
    current_user_id,
    entry.name,
    COALESCE(entry.category, 'Other'),
    COALESCE(entry.proficiency, 'Beginner'),
    NULLIF(entry.years_experience, '')::numeric
  FROM jsonb_to_recordset(COALESCE(p_profile -> 'skills', '[]'::jsonb))
    AS entry(id uuid, name text, category text, proficiency text, years_experience text);

  DELETE FROM public.projects WHERE user_id = current_user_id;
  INSERT INTO public.projects (
    id, user_id, title, description, technologies,
    repository_url, live_url, status, contribution
  )
  SELECT
    COALESCE(entry.id, gen_random_uuid()),
    current_user_id,
    entry.title,
    NULLIF(entry.description, ''),
    COALESCE(entry.technologies, ARRAY[]::text[]),
    NULLIF(entry.repository_url, ''),
    NULLIF(entry.live_url, ''),
    COALESCE(entry.status, 'In progress'),
    NULLIF(entry.contribution, '')
  FROM jsonb_to_recordset(COALESCE(p_profile -> 'projects', '[]'::jsonb))
    AS entry(id uuid, title text, description text, technologies text[], repository_url text, live_url text, status text, contribution text);

  DELETE FROM public.certifications WHERE user_id = current_user_id;
  INSERT INTO public.certifications (id, user_id, name, issuer, issued_on, credential_url)
  SELECT
    COALESCE(entry.id, gen_random_uuid()),
    current_user_id,
    entry.name,
    NULLIF(entry.issuer, ''),
    NULLIF(entry.issue_date, '')::date,
    NULLIF(entry.credential_url, '')
  FROM jsonb_to_recordset(COALESCE(p_profile -> 'certifications', '[]'::jsonb))
    AS entry(id uuid, name text, issuer text, issue_date text, credential_url text);

  DELETE FROM public.experience WHERE user_id = current_user_id;
  INSERT INTO public.experience (
    id, user_id, organization, role, started_on, ended_on, responsibilities, skills_used
  )
  SELECT
    COALESCE(entry.id, gen_random_uuid()),
    current_user_id,
    entry.organization,
    entry.role,
    NULLIF(entry.started_on, '')::date,
    NULLIF(entry.ended_on, '')::date,
    NULLIF(entry.responsibilities, ''),
    COALESCE(entry.skills_used, ARRAY[]::text[])
  FROM jsonb_to_recordset(COALESCE(p_profile -> 'experience', '[]'::jsonb))
    AS entry(id uuid, organization text, role text, started_on text, ended_on text, responsibilities text, skills_used text[]);

  INSERT INTO public.career_preferences (
    user_id, target_role, preferred_domain, goals,
    preferred_location, work_mode, internship_preferences
  )
  VALUES (
    current_user_id,
    NULLIF(p_profile ->> 'targetRole', ''),
    NULLIF(p_profile ->> 'preferredDomain', ''),
    NULLIF(p_profile ->> 'careerGoals', ''),
    NULLIF(p_profile ->> 'preferredLocation', ''),
    NULLIF(p_profile ->> 'workMode', ''),
    NULLIF(p_profile ->> 'internshipPreferences', '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    target_role = EXCLUDED.target_role,
    preferred_domain = EXCLUDED.preferred_domain,
    goals = EXCLUDED.goals,
    preferred_location = EXCLUDED.preferred_location,
    work_mode = EXCLUDED.work_mode,
    internship_preferences = EXCLUDED.internship_preferences;

  DELETE FROM public.student_links WHERE user_id = current_user_id;
  INSERT INTO public.student_links (user_id, label, url)
  SELECT current_user_id, link.label, link.url
  FROM (
    SELECT 'GitHub'::text AS label, NULLIF(p_profile ->> 'github', '') AS url
    UNION ALL
    SELECT 'LinkedIn', NULLIF(p_profile ->> 'linkedin', '')
    UNION ALL
    SELECT 'Portfolio', NULLIF(p_profile ->> 'portfolioUrl', '')
    UNION ALL
    SELECT entry.label, entry.url
    FROM jsonb_to_recordset(COALESCE(p_profile -> 'otherLinks', '[]'::jsonb))
      AS entry(label text, url text)
  ) AS link
  WHERE link.url IS NOT NULL AND link.label IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_student_profile(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_student_profile(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'name', profile.display_name,
    'introduction', COALESCE(profile.introduction, ''),
    'skills', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', skill.id,
        'name', skill.name,
        'category', skill.category,
        'proficiency', skill.proficiency
      ) ORDER BY skill.name)
      FROM public.skills AS skill
      WHERE skill.user_id = profile.user_id
    ), '[]'::jsonb),
    'projects', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', project.id,
        'title', project.title,
        'description', project.description,
        'technologies', project.technologies,
        'repository_url', project.repository_url,
        'live_url', project.live_url,
        'status', project.status
      ) ORDER BY project.created_at DESC)
      FROM public.projects AS project
      WHERE project.user_id = profile.user_id
    ), '[]'::jsonb),
    'certifications', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', certification.id,
        'name', certification.name,
        'issuer', certification.issuer,
        'issued_on', certification.issued_on,
        'credential_url', certification.credential_url
      ) ORDER BY certification.issued_on DESC NULLS LAST)
      FROM public.certifications AS certification
      WHERE certification.user_id = profile.user_id
    ), '[]'::jsonb)
  )
  FROM public.student_profiles AS profile
  WHERE profile.public_enabled = true
    AND profile.public_slug = p_slug
    AND p_slug ~ '^[a-zA-Z0-9-]{3,60}$'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_student_profile(text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_student_profile(text) TO anon;
