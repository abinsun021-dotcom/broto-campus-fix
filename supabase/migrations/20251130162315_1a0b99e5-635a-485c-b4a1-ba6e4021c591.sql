-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Students can view own complaints" ON public.complaints;

-- Create new PERMISSIVE SELECT policy for students (own complaints only)
CREATE POLICY "Students can view own complaints"
ON public.complaints
FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

-- Create PERMISSIVE SELECT policy for admin to view ALL complaints
CREATE POLICY "Admin can view all complaints"
ON public.complaints
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create PERMISSIVE SELECT policy for staff to view ALL complaints
CREATE POLICY "Staff can view all complaints"
ON public.complaints
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role));