import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppPageShell from "@/components/AppPageShell";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

const CmsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<{ title: string; content: string; updated_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPage = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("cms_pages")
        .select("title, content, updated_at")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (!data || error) {
        setNotFound(true);
      } else {
        setPage(data);
      }
      setLoading(false);
    };
    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <AppPageShell>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </AppPageShell>
    );
  }

  if (notFound) {
    return (
      <AppPageShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <h1 className="text-2xl font-bold text-foreground">Página Não Encontrada</h1>
          <Button variant="outline" onClick={() => navigate("/")}>
            Ir para o Início
          </Button>
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell>
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
      </Button>
      <h1 className="text-3xl font-bold text-foreground mb-2">{page!.title}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Última atualização: {new Date(page!.updated_at).toLocaleDateString()}
      </p>
      <div
        className="prose prose-sm max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(page!.content) }}
      />
    </AppPageShell>
  );
};

export default CmsPage;
