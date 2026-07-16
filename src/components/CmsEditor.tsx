import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import RichTextEditor from "./RichTextEditor";

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  updated_at: string;
}

const CmsEditor = () => {
  const { user } = useAuth();
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPage, setEditPage] = useState<CmsPage | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const fetchPages = async () => {
    const { data } = await (supabase as any)
      .from("cms_pages")
      .select("*")
      .order("title");
    setPages(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPages(); }, []);

  const openEditor = (page?: CmsPage) => {
    if (page) {
      setEditPage(page);
      setTitle(page.title);
      setSlug(page.slug);
      setContent(page.content);
      setIsPublished(page.is_published);
      setIsNew(false);
    } else {
      setEditPage({} as CmsPage);
      setTitle("");
      setSlug("");
      setContent("");
      setIsPublished(false);
      setIsNew(true);
    }
  };

  const closeEditor = () => {
    setEditPage(null);
    setTitle("");
    setSlug("");
    setContent("");
    setIsPublished(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      toast.error("Título e slug são obrigatórios");
      return;
    }
    setSaving(true);

    const payload = {
      title: title.trim(),
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      content,
      is_published: isPublished,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    };

    if (isNew) {
      const { error } = await (supabase as any).from("cms_pages").insert(payload);
      if (error) {
        toast.error("Falha ao criar página");
      } else {
        toast.success("Página criada");
        closeEditor();
        fetchPages();
      }
    } else {
      const { error } = await (supabase as any)
        .from("cms_pages")
        .update(payload)
        .eq("id", editPage!.id);
      if (error) {
        toast.error("Falha ao atualizar página");
      } else {
        toast.success("Página atualizada");
        closeEditor();
        fetchPages();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta página?")) return;
    const { error } = await (supabase as any).from("cms_pages").delete().eq("id", id);
    if (error) {
      toast.error("Falha ao excluir página");
    } else {
      toast.success("Página excluída");
      fetchPages();
    }
  };

  const generateSlug = (t: string) => {
    return t
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Carregando páginas CMS...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Páginas CMS</h2>
            <p className="text-sm text-muted-foreground">Gerencie páginas da plataforma como Privacidade, Termos, etc.</p>
          </div>
          <Button size="sm" onClick={() => openEditor()}>
            <Plus className="w-4 h-4 mr-1" /> Nova Página
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {pages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Nenhuma página CMS ainda</p>
                <p className="text-xs mt-1">Crie sua primeira página para começar.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">{page.title}</TableCell>
                      <TableCell className="text-muted-foreground">/{page.slug}</TableCell>
                      <TableCell>
                        {page.is_published ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Publicado</Badge>
                        ) : (
                          <Badge variant="secondary">Rascunho</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(page.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`/page/${page.slug}`, "_blank")}
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditor(page)}
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(page.id)}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Editor Dialog */}
      <Dialog open={!!editPage} onOpenChange={(o) => !o && closeEditor()}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "Criar Página" : "Editar Página"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (isNew) setSlug(generateSlug(e.target.value));
                  }}
                  placeholder="Título da página"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="page-slug"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              <Label>Publicado</Label>
            </div>

            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <RichTextEditor value={content} onChange={setContent} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeEditor}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : isNew ? "Criar Página" : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CmsEditor;
