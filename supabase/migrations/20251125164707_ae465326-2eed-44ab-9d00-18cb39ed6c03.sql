-- Fix search_path for update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix search_path for log_complaint_status_change function  
CREATE OR REPLACE FUNCTION public.log_complaint_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.complaint_events (complaint_id, event_type, old_value, new_value, created_by)
    VALUES (NEW.id, 'status_change', OLD.status::TEXT, NEW.status::TEXT, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;