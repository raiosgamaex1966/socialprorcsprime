
CREATE TABLE public.verification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'profile',
  status TEXT NOT NULL DEFAULT 'pending',
  full_name TEXT,
  reason TEXT,
  document_url TEXT,
  admin_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can submit requests
CREATE POLICY "Users can create verification requests"
ON public.verification_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own verification requests"
ON public.verification_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all verification requests"
ON public.verification_requests FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update verification requests"
ON public.verification_requests FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete requests
CREATE POLICY "Admins can delete verification requests"
ON public.verification_requests FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
