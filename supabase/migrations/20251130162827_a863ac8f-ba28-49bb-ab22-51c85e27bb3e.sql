-- Fix attachments table RLS - make policies PERMISSIVE
DROP POLICY IF EXISTS "Students can upload attachments to own complaints" ON public.attachments;
DROP POLICY IF EXISTS "Users can view attachments for accessible complaints" ON public.attachments;

-- Create PERMISSIVE SELECT policy - students see own, staff/admin see all
CREATE POLICY "Students can view own attachments"
ON public.attachments
FOR SELECT
TO authenticated
USING (uploaded_by = auth.uid());

CREATE POLICY "Staff can view all attachments"
ON public.attachments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Admin can view all attachments"
ON public.attachments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create PERMISSIVE INSERT policy for students
CREATE POLICY "Students can upload attachments"
ON public.attachments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by 
  AND EXISTS (
    SELECT 1 FROM complaints 
    WHERE complaints.id = complaint_id 
    AND complaints.reporter_id = auth.uid()
  )
);

-- Storage policies for complaint-attachments bucket
-- Allow users to upload to their own folder
CREATE POLICY "Users can upload own attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'complaint-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own attachments
CREATE POLICY "Users can view own attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'complaint-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow staff/admin to view all attachments
CREATE POLICY "Staff can view all attachments in storage"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'complaint-attachments'
  AND (
    has_role(auth.uid(), 'staff'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);