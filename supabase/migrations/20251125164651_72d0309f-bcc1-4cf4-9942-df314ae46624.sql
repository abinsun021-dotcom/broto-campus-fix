-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('student', 'staff', 'admin');

-- Create complaint status enum
CREATE TYPE public.complaint_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Create complaint priority enum
CREATE TYPE public.complaint_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create user_roles table (CRITICAL: roles stored separately for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- User roles policies
CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Create function to check if user has role (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority complaint_priority NOT NULL DEFAULT 'medium',
  status complaint_status NOT NULL DEFAULT 'open',
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on complaints
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Complaints policies
CREATE POLICY "Students can view own complaints"
  ON public.complaints FOR SELECT
  TO authenticated
  USING (
    auth.uid() = reporter_id OR 
    public.has_role(auth.uid(), 'staff') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Students can create complaints"
  ON public.complaints FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Staff can update complaints"
  ON public.complaints FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'staff') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Create complaint_events table (timeline)
CREATE TABLE public.complaint_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  comment TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on complaint_events
ALTER TABLE public.complaint_events ENABLE ROW LEVEL SECURITY;

-- Complaint events policies
CREATE POLICY "Users can view events for accessible complaints"
  ON public.complaint_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints
      WHERE id = complaint_events.complaint_id
      AND (
        reporter_id = auth.uid() OR
        public.has_role(auth.uid(), 'staff') OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "Staff can create events"
  ON public.complaint_events FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'staff') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Create attachments table
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on attachments
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Attachments policies
CREATE POLICY "Users can view attachments for accessible complaints"
  ON public.attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints
      WHERE id = attachments.complaint_id
      AND (
        reporter_id = auth.uid() OR
        public.has_role(auth.uid(), 'staff') OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "Students can upload attachments to own complaints"
  ON public.attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM public.complaints
      WHERE id = attachments.complaint_id
      AND reporter_id = auth.uid()
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  
  -- Assign student role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create function to automatically log complaint status changes
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

-- Create trigger for complaint status changes
CREATE TRIGGER log_complaint_status_change
  AFTER UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.log_complaint_status_change();

-- Create storage bucket for complaint attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-attachments', 'complaint-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for complaint attachments
CREATE POLICY "Users can view attachments for accessible complaints"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'complaint-attachments' AND
    EXISTS (
      SELECT 1 FROM public.attachments a
      JOIN public.complaints c ON c.id = a.complaint_id
      WHERE a.file_path = name
      AND (
        c.reporter_id = auth.uid() OR
        public.has_role(auth.uid(), 'staff') OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "Students can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'complaint-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );