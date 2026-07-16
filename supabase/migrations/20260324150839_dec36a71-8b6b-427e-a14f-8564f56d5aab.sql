
-- Add attachment columns to messages table
ALTER TABLE public.messages 
  ADD COLUMN attachment_url text DEFAULT NULL,
  ADD COLUMN attachment_type text DEFAULT NULL,
  ADD COLUMN attachment_name text DEFAULT NULL;

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to their own folder
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;
CREATE POLICY "Users can upload chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: anyone authenticated can view chat attachments
DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;
CREATE POLICY "Users can view chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments');

-- Storage RLS: users can delete their own uploads
DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;
CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
