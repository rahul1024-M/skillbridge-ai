ALTER TABLE public.roadmap_items
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS skill text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS topics text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS project_milestones text[] NOT NULL DEFAULT '{}';

CREATE TABLE public.student_career_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  plan jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX student_career_analyses_user_generated_idx
  ON public.student_career_analyses(user_id, generated_at DESC);
ALTER TABLE public.student_career_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY student_career_analyses_manage_own
  ON public.student_career_analyses FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_career_analyses TO authenticated;

CREATE OR REPLACE FUNCTION public.replace_student_roadmap(
  p_title text,
  p_target_role text,
  p_source_profile jsonb,
  p_items jsonb,
  p_career_plan jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  new_roadmap_id uuid;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 OR length(p_title) > 160 THEN
    RAISE EXCEPTION 'A roadmap title is required.';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 40 THEN
    RAISE EXCEPTION 'A roadmap must contain between 1 and 40 items.';
  END IF;
  IF p_career_plan IS NULL OR jsonb_typeof(p_career_plan) <> 'object' THEN
    RAISE EXCEPTION 'A structured career plan is required.';
  END IF;

  UPDATE public.learning_roadmaps
  SET status = 'archived', updated_at = now()
  WHERE user_id = current_user_id AND status = 'active';

  INSERT INTO public.learning_roadmaps (
    user_id, title, target_role, generated_by, source_profile
  )
  VALUES (
    current_user_id,
    trim(p_title),
    NULLIF(trim(COALESCE(p_target_role, '')), ''),
    'ai',
    COALESCE(p_source_profile, '{}'::jsonb)
  )
  RETURNING id INTO new_roadmap_id;

  INSERT INTO public.roadmap_items (
    roadmap_id, user_id, title, description, resources, assignment,
    estimated_minutes, position, stage, skill, topics, project_milestones
  )
  SELECT
    new_roadmap_id,
    current_user_id,
    left(COALESCE(item.skill, item.title, 'Learning task'), 160),
    NULLIF(left(COALESCE(item.description, ''), 2000), ''),
    COALESCE(item.resources, '[]'::jsonb),
    NULLIF(left(COALESCE(item.assignment, ''), 1000), ''),
    greatest(0, least(COALESCE(item.estimated_minutes, 120), 10080)),
    item.position,
    left(COALESCE(item.stage, ''), 160),
    left(COALESCE(item.skill, item.title, ''), 120),
    COALESCE(item.topics, ARRAY[]::text[]),
    COALESCE(item.project_milestones, ARRAY[]::text[])
  FROM jsonb_to_recordset(p_items) AS item(
    title text,
    skill text,
    stage text,
    description text,
    resources jsonb,
    assignment text,
    estimated_minutes integer,
    position integer,
    topics text[],
    project_milestones text[]
  );

  INSERT INTO public.student_progress (user_id, activity_type, description, metadata)
  VALUES (
    current_user_id,
    'roadmap_generated',
    'Generated a personalized roadmap for ' || left(trim(p_title), 120),
    jsonb_build_object('roadmap_id', new_roadmap_id)
  );

  INSERT INTO public.student_career_analyses (user_id, plan)
  VALUES (current_user_id, p_career_plan);

  RETURN new_roadmap_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_roadmap_item_status(
  p_item_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  updated_item public.roadmap_items%ROWTYPE;
  previous_status text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;
  IF p_status NOT IN ('not_started', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Invalid roadmap item status.';
  END IF;

  SELECT status INTO previous_status
  FROM public.roadmap_items
  WHERE id = p_item_id AND user_id = current_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Roadmap item not found.';
  END IF;

  UPDATE public.roadmap_items
  SET status = p_status,
      completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_item_id AND user_id = current_user_id
  RETURNING * INTO updated_item;

  IF previous_status <> p_status THEN
    INSERT INTO public.student_progress (
      user_id, roadmap_item_id, activity_type, description, metadata
    )
    VALUES (
      current_user_id,
      updated_item.id,
      CASE p_status
        WHEN 'completed' THEN 'roadmap_item_completed'
        WHEN 'in_progress' THEN 'roadmap_item_started'
        ELSE 'roadmap_item_reopened'
      END,
      CASE p_status
        WHEN 'completed' THEN 'Completed roadmap task: '
        WHEN 'in_progress' THEN 'Started roadmap task: '
        ELSE 'Reopened roadmap task: '
      END || left(updated_item.title, 160),
      jsonb_build_object('roadmap_id', updated_item.roadmap_id)
    );
  END IF;

  RETURN to_jsonb(updated_item);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_proof_of_work_audit(p_result jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  submission_id uuid;
  audit_id uuid;
  repository_url text := p_result #>> '{repository,url}';
  analysis jsonb := p_result -> 'analysis';
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;
  IF repository_url !~* '^https://github\.com/[^/]+/[^/]+/?$' THEN
    RAISE EXCEPTION 'Invalid public repository URL.';
  END IF;
  IF jsonb_typeof(analysis) <> 'object' OR
     (analysis ->> 'score')::integer NOT BETWEEN 0 AND 100 THEN
    RAISE EXCEPTION 'Invalid repository assessment.';
  END IF;

  INSERT INTO public.proof_of_work_submissions (
    user_id, repository_url, repository_full_name, status
  )
  VALUES (
    current_user_id,
    repository_url,
    left(COALESCE(p_result #>> '{repository,name}', ''), 160),
    'reviewed'
  )
  RETURNING id INTO submission_id;

  INSERT INTO public.proof_of_work_audits (
    submission_id, user_id, repository_url, commit_sha, files_reviewed,
    rubric, score, status, summary, strengths, improvements, skills, limitations
  )
  VALUES (
    submission_id,
    current_user_id,
    repository_url,
    NULLIF(left(COALESCE(p_result #>> '{repository,commitSha}', ''), 80), ''),
    COALESCE(p_result #> '{repository,files}', '[]'::jsonb),
    jsonb_build_object(
      'categories', COALESCE(analysis -> 'categories', '[]'::jsonb),
      'scoreScale', 'Each of 10 categories is rated 0-5; total is the arithmetic mean scaled to 0-100.'
    ),
    (analysis ->> 'score')::integer,
    COALESCE(analysis ->> 'status', 'Evidence reviewed'),
    left(COALESCE(analysis ->> 'summary', ''), 1000),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(analysis -> 'strengths', '[]'::jsonb))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(analysis -> 'improvements', '[]'::jsonb))),
    COALESCE(analysis -> 'skills', '[]'::jsonb),
    ARRAY['AI review samples a limited set of public files.', 'This review does not prove authorship or certify proficiency.']
  )
  RETURNING id INTO audit_id;

  INSERT INTO public.student_progress (user_id, activity_type, description, metadata)
  VALUES (
    current_user_id,
    'repository_audit_completed',
    'Reviewed public repository ' || left(COALESCE(p_result #>> '{repository,name}', 'repository'), 160),
    jsonb_build_object('audit_id', audit_id, 'submission_id', submission_id)
  );

  RETURN jsonb_build_object('submission_id', submission_id, 'audit_id', audit_id);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_student_roadmap(text, text, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_roadmap_item_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_proof_of_work_audit(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_student_roadmap(text, text, jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_roadmap_item_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_proof_of_work_audit(jsonb) TO authenticated;

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
    'education', (
      SELECT jsonb_build_object(
        'institution', education.institution,
        'degree', education.degree,
        'department', education.department,
        'academic_year', education.academic_year,
        'graduation_year', education.graduation_year
      )
      FROM public.education AS education
      WHERE education.user_id = profile.user_id
    ),
    'career', (
      SELECT jsonb_build_object(
        'target_role', preferences.target_role,
        'preferred_domain', preferences.preferred_domain
      )
      FROM public.career_preferences AS preferences
      WHERE preferences.user_id = profile.user_id
    ),
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
    ), '[]'::jsonb),
    'evidence', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'repository', submission.repository_full_name,
        'repository_url', audit.repository_url,
        'commit_sha', audit.commit_sha,
        'status', audit.status,
        'score', audit.score,
        'summary', audit.summary,
        'skills', audit.skills,
        'audited_at', audit.audited_at
      ) ORDER BY audit.audited_at DESC)
      FROM public.proof_of_work_audits AS audit
      JOIN public.proof_of_work_submissions AS submission
        ON submission.id = audit.submission_id
       AND submission.user_id = audit.user_id
      WHERE audit.user_id = profile.user_id
        AND audit.status = 'Evidence reviewed'
    ), '[]'::jsonb),
    'timeline', COALESCE((
      SELECT jsonb_agg(event ORDER BY (event ->> 'occurred_at') DESC)
      FROM (
        SELECT jsonb_build_object(
          'type', 'skill',
          'title', 'Skill added: ' || skill.name,
          'occurred_at', skill.created_at
        ) AS event
        FROM public.skills AS skill
        WHERE skill.user_id = profile.user_id
        UNION ALL
        SELECT jsonb_build_object(
          'type', 'project',
          'title', 'Project added: ' || project.title,
          'occurred_at', project.created_at
        )
        FROM public.projects AS project
        WHERE project.user_id = profile.user_id
        UNION ALL
        SELECT jsonb_build_object(
          'type', 'certification',
          'title', 'Certification added: ' || certification.name,
          'occurred_at', certification.created_at
        )
        FROM public.certifications AS certification
        WHERE certification.user_id = profile.user_id
        UNION ALL
        SELECT jsonb_build_object(
          'type', 'evidence',
          'title', 'Public repository reviewed',
          'occurred_at', audit.audited_at
        )
        FROM public.proof_of_work_audits AS audit
        WHERE audit.user_id = profile.user_id
          AND audit.status = 'Evidence reviewed'
      ) AS timeline_events
    ), '[]'::jsonb)
  )
  FROM public.student_profiles AS profile
  WHERE profile.public_enabled = true
    AND profile.public_slug = p_slug
    AND p_slug ~ '^[a-zA-Z0-9-]{3,60}$'
  LIMIT 1;
$$;
