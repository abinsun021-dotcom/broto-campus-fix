-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

-- Create permissive SELECT policies
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (true);