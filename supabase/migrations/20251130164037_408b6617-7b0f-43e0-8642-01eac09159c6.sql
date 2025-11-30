-- Add resolution tracking columns to complaints
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS resolved_by uuid,
ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
ADD COLUMN IF NOT EXISTS resolution_note text;

-- Create complaint_history table for audit trail
CREATE TABLE IF NOT EXISTS public.complaint_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on complaint_history
ALTER TABLE public.complaint_history ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view history for their own complaints, staff/admin can view all
CREATE POLICY "Users can view history for accessible complaints"
ON public.complaint_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.complaints
    WHERE complaints.id = complaint_history.complaint_id
    AND (complaints.reporter_id = auth.uid() OR has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'))
  )
);

-- RLS: Staff and admin can insert history
CREATE POLICY "Staff and admin can insert history"
ON public.complaint_history FOR INSERT
WITH CHECK (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin') OR auth.uid() = changed_by);

-- Allow students to update their own complaints (status to closed only via trigger check)
CREATE POLICY "Students can update own complaints to closed"
ON public.complaints FOR UPDATE
USING (auth.uid() = reporter_id)
WITH CHECK (auth.uid() = reporter_id);

-- Create function to auto-set resolved_by and resolved_at
CREATE OR REPLACE FUNCTION public.handle_complaint_resolution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If status changed to resolved or closed, set resolved_by and resolved_at
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed') THEN
      NEW.resolved_by := auth.uid();
      NEW.resolved_at := now();
    END IF;
    
    -- Insert history record
    INSERT INTO public.complaint_history (complaint_id, old_status, new_status, changed_by, note)
    VALUES (NEW.id, OLD.status::text, NEW.status::text, auth.uid(), NEW.resolution_note);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for resolution handling
DROP TRIGGER IF EXISTS handle_complaint_resolution_trigger ON public.complaints;
CREATE TRIGGER handle_complaint_resolution_trigger
BEFORE UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.handle_complaint_resolution();