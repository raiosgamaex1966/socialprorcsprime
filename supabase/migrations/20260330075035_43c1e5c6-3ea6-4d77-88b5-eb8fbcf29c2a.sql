-- Pages table
CREATE TABLE public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  category text NOT NULL DEFAULT 'business',
  description text,
  about text,
  avatar_url text,
  cover_photo_url text,
  website text,
  phone text,
  email text,
  location text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view pages
CREATE POLICY "Anyone can view pages" ON public.pages
  FOR SELECT TO authenticated USING (true);

-- Only creator can insert
CREATE POLICY "Users can create pages" ON public.pages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Only creator can update
CREATE POLICY "Page owner can update" ON public.pages
  FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Only creator can delete
CREATE POLICY "Page owner can delete" ON public.pages
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Page admins table (for multi-admin support)
CREATE TABLE public.page_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_id, user_id)
);

ALTER TABLE public.page_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view page admins" ON public.page_admins
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Page owner can manage admins" ON public.page_admins
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.pages WHERE id = page_id AND created_by = auth.uid())
  );

-- Page followers table
CREATE TABLE public.page_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_id, user_id)
);

ALTER TABLE public.page_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view followers" ON public.page_followers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can follow pages" ON public.page_followers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow pages" ON public.page_followers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Page posts table
CREATE TABLE public.page_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_url text,
  image_urls text[],
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.page_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view page posts" ON public.page_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Page owner can create posts" ON public.page_posts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.pages WHERE id = page_id AND created_by = auth.uid())
  );

CREATE POLICY "Page owner can update posts" ON public.page_posts
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.pages WHERE id = page_id AND created_by = auth.uid())
  );

CREATE POLICY "Page owner can delete posts" ON public.page_posts
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.pages WHERE id = page_id AND created_by = auth.uid())
  );

-- Page post likes
CREATE TABLE public.page_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_post_id uuid NOT NULL REFERENCES public.page_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_post_id, user_id)
);

ALTER TABLE public.page_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view page post likes" ON public.page_post_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can like page posts" ON public.page_post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike page posts" ON public.page_post_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Page post comments
CREATE TABLE public.page_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_post_id uuid NOT NULL REFERENCES public.page_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.page_post_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.page_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view page post comments" ON public.page_post_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can comment on page posts" ON public.page_post_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.page_post_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for page images
INSERT INTO storage.buckets (id, name, public) VALUES ('page-images', 'page-images', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload page images" ON storage.objects;
CREATE POLICY "Authenticated users can upload page images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'page-images');

DROP POLICY IF EXISTS "Anyone can view page images" ON storage.objects;
CREATE POLICY "Anyone can view page images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'page-images');

DROP POLICY IF EXISTS "Users can delete own page images" ON storage.objects;
CREATE POLICY "Users can delete own page images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'page-images');

-- Updated_at triggers
CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_page_posts_updated_at BEFORE UPDATE ON public.page_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to check if user is page admin
CREATE OR REPLACE FUNCTION public.is_page_admin(_page_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pages WHERE id = _page_id AND created_by = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.page_admins WHERE page_id = _page_id AND user_id = _user_id
  )
$$;