import { useState, useEffect } from "react";
import TablePagination, { usePagination } from "@/components/admin/TablePagination";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, FileText, Settings, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PageRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  avatar_url: string | null;
  created_at: string;
  created_by: string;
  creator_name?: string;
  follower_count?: number;
}

const AdminPagesManagement = () => {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingPage, setEditingPage] = useState<PageRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchPages(); }, []);

  const fetchPages = async () => {
    setLoading(true);
    const { data: pagesData } = await supabase.from("pages").select("*").order("created_at", { ascending: false });
    if (pagesData) {
      const creatorIds = [...new Set(pagesData.map((p: any) => p.created_by))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", creatorIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));
      const pageIds = pagesData.map((p: any) => p.id);
      const { data: followers } = await supabase.from("page_followers").select("page_id").in("page_id", pageIds);
      const countMap = new Map<string, number>();
      (followers || []).forEach((f: any) => countMap.set(f.page_id, (countMap.get(f.page_id) || 0) + 1));
      setPages(pagesData.map((p: any) => ({ ...p, creator_name: profileMap.get(p.created_by) || "Desconhecido", follower_count: countMap.get(p.id) || 0 })));
    }
    setLoading(false);
  };

  const handleEditPage = (page: PageRow) => { setEditingPage(page); setEditName(page.name); setEditDescription(page.description || ""); setEditCategory(page.category); };
  const handleSavePage = async () => {
    if (!editingPage || !editName.trim()) return;
    setSaving(true);
    await supabase.from("pages").update({ name: editName.trim(), description: editDescription.trim() || null, category: editCategory }).eq("id", editingPage.id);
    toast.success("Página atualizada"); setSaving(false); setEditingPage(null); fetchPages();
  };

  const handleDeletePage = async (pageId: string) => {
    setDeleting(true);
    await supabase.from("pages").delete().eq("id", pageId);
    toast.success("Página excluída"); setConfirmDelete(null); setDeleting(false); fetchPages();
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    const ids = [...selected];
    await (supabase as any).from("pages").delete().in("id", ids);
    toast.success(`${ids.length} página(s) excluída(s)`);
    setSelected(new Set()); setConfirmBulkDelete(false); setDeleting(false); fetchPages();
  };

  const filtered = pages.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));
  const pagination = usePagination(filtered, 15);

  const toggleSelect = (id: string) => { setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const toggleAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map((p) => p.id))); };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{pages.length}</p><p className="text-xs text-muted-foreground">Total de Páginas</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{pages.reduce((sum, p) => sum + (p.follower_count || 0), 0)}</p><p className="text-xs text-muted-foreground">Total de Seguidores</p></div>
          </CardContent>
        </Card>
      </div>

      <BulkActionsBar
        selectedCount={selected.size}
        totalCount={filtered.length}
        onSelectAll={toggleAll}
        onClearSelection={() => setSelected(new Set())}
        allSelected={selected.size === filtered.length && filtered.length > 0}
        actions={[
          { label: `Excluir ${selected.size}`, onClick: () => setConfirmBulkDelete(true), variant: "destructive", icon: <Trash2 className="w-3.5 h-3.5 mr-1" /> },
        ]}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Todas as Páginas</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Pesquisar páginas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead>Página</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Seguidores</TableHead>
                  <TableHead>Proprietário</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedItems.map((page) => (
                  <TableRow key={page.id} className={selected.has(page.id) ? "bg-primary/5" : ""}>
                    <TableCell><Checkbox checked={selected.has(page.id)} onCheckedChange={() => toggleSelect(page.id)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {page.avatar_url ? (
                          <img src={page.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-4 h-4 text-primary" /></div>
                        )}
                        <div>
                          <span className="font-medium text-sm">{page.name}</span>
                          <p className="text-[10px] text-muted-foreground">/{page.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{page.category}</Badge></TableCell>
                    <TableCell className="text-sm">{page.follower_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{page.creator_name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleEditPage(page)}>
                          <Settings className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => setConfirmDelete(page.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pagination.paginatedItems.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma página encontrada.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination {...pagination} onPageChange={pagination.setCurrentPage} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Página</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" maxLength={100} />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full mt-1 px-3 py-2 bg-secondary rounded-lg text-sm border-none outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="mt-1" />
            </div>
            <Button onClick={handleSavePage} disabled={!editName.trim() || saving} className="w-full">{saving ? "Salvando..." : "Salvar Alterações"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)} title="Excluir Página" description="Tem certeza de que deseja excluir esta página permanentemente? Todas as publicações e seguidores serão removidos." confirmLabel="Excluir" onConfirm={() => confirmDelete && handleDeletePage(confirmDelete)} loading={deleting} />
      <ConfirmDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete} title="Excluir Páginas Selecionadas" description={`Tem certeza de que deseja excluir ${selected.size} página(s)? Esta ação não pode ser desfeita.`} confirmLabel={`Excluir ${selected.size} Páginas`} onConfirm={handleBulkDelete} loading={deleting} />
    </div>
  );
};

export default AdminPagesManagement;
