CREATE TABLE public.student_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL
    REFERENCES public.student_profiles(user_id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN (
    'internship_update',
    'application_update',
    'hackathon_update',
    'roadmap_milestone',
    'proof_of_work_audit',
    'skill_recommendation'
  )),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  message text NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 1000),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX student_notifications_user_created_idx
  ON public.student_notifications (user_id, created_at DESC);
CREATE INDEX student_notifications_unread_idx
  ON public.student_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE public.student_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_notifications FROM PUBLIC, anon, authenticated;
CREATE POLICY student_notifications_read_own
  ON public.student_notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY student_notifications_mark_own_read
  ON public.student_notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND read_at IS NOT NULL);
GRANT SELECT ON public.student_notifications TO authenticated;
GRANT UPDATE (read_at) ON public.student_notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.create_student_notification(
  p_user_id uuid,
  p_category text,
  p_title text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.student_notifications (
    user_id, category, title, message, metadata
  )
  VALUES (
    p_user_id,
    p_category,
    left(trim(p_title), 160),
    left(trim(p_message), 1000),
    COALESCE(p_metadata, '{}'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.create_student_notification(uuid, text, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_student_internship_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  internship_title text;
BEGIN
  IF NEW.application_status IS NULL OR
     (TG_OP = 'UPDATE' AND NEW.application_status IS NOT DISTINCT FROM OLD.application_status) THEN
    RETURN NEW;
  END IF;

  internship_title := COALESCE(
    NULLIF(NEW.listing_snapshot ->> 'title', ''),
    'An internship application'
  );
  PERFORM public.create_student_notification(
    NEW.user_id,
    'application_update',
    'Application status updated',
    internship_title || ' is now marked ' || NEW.application_status || '.',
    jsonb_build_object(
      'tracking_id', NEW.id,
      'source_name', NEW.source_name,
      'external_id', NEW.external_id,
      'application_status', NEW.application_status
    )
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_student_internship_status() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER student_internship_status_notification
  AFTER INSERT OR UPDATE OF application_status ON public.student_internship_tracking
  FOR EACH ROW EXECUTE FUNCTION public.notify_student_internship_status();

CREATE OR REPLACE FUNCTION public.notify_student_saved_internship_listing_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  internship_title text;
BEGIN
  IF NOT OLD.is_saved OR NOT NEW.is_saved OR
     OLD.listing_snapshot IS NOT DISTINCT FROM NEW.listing_snapshot THEN
    RETURN NEW;
  END IF;

  internship_title := COALESCE(
    NULLIF(NEW.listing_snapshot ->> 'title', ''),
    'A saved internship listing'
  );
  PERFORM public.create_student_notification(
    NEW.user_id,
    'internship_update',
    'Saved internship listing updated',
    'The source details for ' || internship_title || ' have changed. Review the listing before applying.',
    jsonb_build_object(
      'tracking_id', NEW.id,
      'source_name', NEW.source_name,
      'external_id', NEW.external_id,
      'application_url', NEW.application_url
    )
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_student_saved_internship_listing_update() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER saved_internship_listing_notification
  AFTER UPDATE OF listing_snapshot ON public.student_internship_tracking
  FOR EACH ROW EXECUTE FUNCTION public.notify_student_saved_internship_listing_update();

CREATE OR REPLACE FUNCTION public.notify_student_saved_hackathon_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  saved_student record;
BEGIN
  IF OLD.name IS NOT DISTINCT FROM NEW.name
    AND OLD.description IS NOT DISTINCT FROM NEW.description
    AND OLD.location IS NOT DISTINCT FROM NEW.location
    AND OLD.mode IS NOT DISTINCT FROM NEW.mode
    AND OLD.starts_at IS NOT DISTINCT FROM NEW.starts_at
    AND OLD.ends_at IS NOT DISTINCT FROM NEW.ends_at
    AND OLD.registration_deadline IS NOT DISTINCT FROM NEW.registration_deadline
    AND OLD.prize_pool IS NOT DISTINCT FROM NEW.prize_pool
    AND OLD.technologies IS NOT DISTINCT FROM NEW.technologies
    AND OLD.registration_url IS NOT DISTINCT FROM NEW.registration_url
    AND OLD.source_url IS NOT DISTINCT FROM NEW.source_url
    AND OLD.is_published IS NOT DISTINCT FROM NEW.is_published
    AND OLD.verification_status IS NOT DISTINCT FROM NEW.verification_status THEN
    RETURN NEW;
  END IF;

  FOR saved_student IN
    SELECT user_id FROM public.saved_hackathons WHERE hackathon_id = NEW.id
  LOOP
    PERFORM public.create_student_notification(
      saved_student.user_id,
      'hackathon_update',
      'Saved hackathon updated',
      'The source listing for ' || NEW.name || ' has changed. Review the event details before registering.',
      jsonb_build_object('hackathon_id', NEW.id)
    );
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_student_saved_hackathon_update() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER saved_hackathon_listing_notification
  AFTER UPDATE OF name, description, location, mode, starts_at, ends_at,
    registration_deadline, prize_pool, technologies, registration_url, source_url,
    is_published, verification_status
  ON public.hackathons
  FOR EACH ROW EXECUTE FUNCTION public.notify_student_saved_hackathon_update();

CREATE OR REPLACE FUNCTION public.notify_student_roadmap_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.create_student_notification(
      NEW.user_id,
      'roadmap_milestone',
      'Learning roadmap milestone completed',
      'You completed "' || NEW.title || '".',
      jsonb_build_object('roadmap_id', NEW.roadmap_id, 'roadmap_item_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_student_roadmap_milestone() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER roadmap_item_completion_notification
  AFTER UPDATE OF status ON public.roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_student_roadmap_milestone();

CREATE OR REPLACE FUNCTION public.notify_student_proof_of_work_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.create_student_notification(
    NEW.user_id,
    'proof_of_work_audit',
    'Proof of Work audit completed',
    COALESCE(NULLIF(NEW.summary, ''), 'Your submitted repository audit is ready for review.')
      || CASE WHEN NEW.score IS NULL THEN '' ELSE ' Score: ' || NEW.score::text || '/100.' END,
    jsonb_build_object(
      'audit_id', NEW.id,
      'submission_id', NEW.submission_id,
      'status', NEW.status,
      'score', NEW.score,
      'repository_url', NEW.repository_url
    )
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_student_proof_of_work_audit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER proof_of_work_audit_notification
  AFTER INSERT ON public.proof_of_work_audits
  FOR EACH ROW EXECUTE FUNCTION public.notify_student_proof_of_work_audit();

CREATE OR REPLACE FUNCTION public.notify_student_skill_recommendation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  gap_count integer;
  gap_names text;
BEGIN
  IF jsonb_typeof(NEW.plan -> 'skillGaps') IS DISTINCT FROM 'array' THEN
    RETURN NEW;
  END IF;

  SELECT count(*), string_agg(
    COALESCE(NULLIF(item ->> 'skill', ''), NULLIF(item ->> 'name', ''), 'a skill gap'),
    ', ' ORDER BY ordinal
  )
  INTO gap_count, gap_names
  FROM jsonb_array_elements(NEW.plan -> 'skillGaps') WITH ORDINALITY AS gaps(item, ordinal);

  IF gap_count > 0 THEN
    PERFORM public.create_student_notification(
      NEW.user_id,
      'skill_recommendation',
      'New skill recommendations available',
      'Your latest career analysis identified: ' || left(gap_names, 650) || '.',
      jsonb_build_object('career_analysis_id', NEW.id, 'skill_gap_count', gap_count)
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_student_skill_recommendation() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER student_skill_recommendation_notification
  AFTER INSERT ON public.student_career_analyses
  FOR EACH ROW EXECUTE FUNCTION public.notify_student_skill_recommendation();
