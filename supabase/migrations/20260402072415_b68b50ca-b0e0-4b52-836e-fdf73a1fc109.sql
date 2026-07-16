
CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

-- Anyone can read published pages
CREATE POLICY "Published CMS pages viewable by all"
  ON public.cms_pages FOR SELECT
  TO public
  USING (is_published = true);

-- Authenticated users can read all pages (for admin)
CREATE POLICY "Admins can view all CMS pages"
  ON public.cms_pages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert
CREATE POLICY "Admins can create CMS pages"
  ON public.cms_pages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update CMS pages"
  ON public.cms_pages FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete CMS pages"
  ON public.cms_pages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed default pages
INSERT INTO public.cms_pages (slug, title, content, is_published) VALUES
  ('privacy', 'Política de Privacidade', '<h2>Política de Privacidade</h2><p>Sua privacidade é importante para nós. Esta política explica como o Social Pro coleta, usa e protege suas informações pessoais.</p><h3>Informações que Coletamos</h3><p>Coletamos informações que você fornece diretamente, como seu nome, e-mail e detalhes do perfil.</p><h3>Como Usamos Suas Informações</h3><p>Usamos suas informações para fornecer e melhorar nossos serviços, nos comunicar com você e garantir a segurança da plataforma.</p>', true),
  ('terms', 'Termos de Serviço', '<h2>Termos de Serviço</h2><p>Ao usar o Social Pro, você concorda com estes termos. Por favor, leia-os com atenção.</p><h3>Responsabilidades da Conta</h3><p>Você é responsável por manter a segurança de sua conta e de todas as atividades realizadas nela.</p><h3>Diretrizes de Conteúdo</h3><p>Você concorda em não publicar conteúdo que seja ilegal, prejudicial ou que viole os direitos de terceiros.</p>', true),
  ('ad-choices', 'Escolhas de Anúncios', '<h2>Escolhas de Anúncios</h2><p>Saiba como funciona a publicidade no Social Pro e suas escolhas em relação aos anúncios.</p><h3>Como os Anúncios Funcionam</h3><p>Mostramos anúncios com base em seus interesses e atividades na plataforma.</p><h3>Suas Escolhas</h3><p>Você pode ajustar suas preferências de anúncios nas configurações de sua conta.</p>', true),
  ('cookies', 'Política de Cookies', '<h2>Política de Cookies</h2><p>O Social Pro usa cookies para melhorar sua experiência em nossa plataforma.</p><h3>O que são Cookies</h3><p>Cookies são pequenos arquivos de texto armazenados no seu dispositivo que nos ajudam a reconhecer você e lembrar de suas preferências.</p><h3>Gerenciando Cookies</h3><p>Você pode controlar os cookies através das configurações do seu navegador.</p>', true);
