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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Users, Crown, ShieldCheck, Shield, UserMinus, Settings, Globe, Lock, Loader2, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GROUP_CATEGORIES } from "@/constants/groupCategories";

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  privacy: string;
  category: string;
  avatar_url: string | null;
  created_at: string;
  created_by: string;
  member_count?: number;
  creator_name?: string;
}

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  display_name?: string;
  avatar_url?: string;
}

const AdminGroupsManagement = () => {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrivacy, setEditPrivacy] = useState("public");
  const [editCategory, setEditCategory] = useState("General");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    setLoading(true);
    const { data: groupsData } = await supabase.from("groups").select("*").order("created_at", { ascending: false });
    if (groupsData) {
      const groupIds = groupsData.map((g: any) => g.id);
      const { data: membersData } = await supabase.from("group_members").select("group_id").in("group_id", groupIds).eq("status", "approved");
      const countMap = new Map<string, number>();
      (membersData || []).forEach((m: any) => { countMap.set(m.group_id, (countMap.get(m.group_id) || 0) + 1); });
      const creatorIds = [...new Set(groupsData.map((g: any) => g.created_by))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", creatorIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));
      setGroups(groupsData.map((g: any) => ({
        ...g,
        member_count: countMap.get(g.id) || 0,
        creator_name: profileMap.get(g.created_by) || "Desconhecido",
      })));
    }
    setLoading(false);
  };

  const fetchMembers = async (groupId: string) => {
    setMembersLoading(true);
    const { data } = await supabase.from("group_members").select("*").eq("group_id", groupId).order("joined_at");
    if (data) {
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setMembers(data.map((m: any) => ({
        ...m,
        display_name: profileMap.get(m.user_id)?.display_name || "Desconhecido",
        avatar_url: profileMap.get(m.user_id)?.avatar_url,
      })));
    }
    setMembersLoading(false);
  };

  const handleViewMembers = (group: GroupRow) => { setSelectedGroup(group); fetchMembers(group.id); };
  const handleSetRole = async (memberId: string, role: string) => {
    await supabase.from("group_members").update({ role }).eq("id", memberId);
    const roleLabel = role === "admin" ? "administrador" : role === "moderator" ? "moderador" : "membro";
    toast.success(`Função atualizada para ${roleLabel}`);
    if (selectedGroup) fetchMembers(selectedGroup.id);
  };
  const handleApproveMember = async (memberId: string) => {
    await supabase.from("group_members").update({ status: "approved" }).eq("id", memberId);
    toast.success("Membro aprovado");
    if (selectedGroup) fetchMembers(selectedGroup.id);
  };
  const handleRemoveMember = async (memberId: string) => {
    await supabase.from("group_members").delete().eq("id", memberId);
    toast.success("Membro removido");
    if (selectedGroup) fetchMembers(selectedGroup.id);
  };
  const handleEditGroup = (group: GroupRow) => {
    setEditingGroup(group); setEditName(group.name); setEditDescription(group.description || "");
    setEditPrivacy(group.privacy); setEditCategory(group.category);
  };
  const handleSaveGroup = async () => {
    if (!editingGroup || !editName.trim()) return;
    setSaving(true);
    await supabase.from("groups").update({ name: editName.trim(), description: editDescription.trim() || null, privacy: editPrivacy, category: editCategory } as any).eq("id", editingGroup.id);
    toast.success("Grupo atualizado"); setSaving(false); setEditingGroup(null); fetchGroups();
  };

  const handleDeleteGroup = async (groupId: string) => {
    setDeleting(true);
    await supabase.from("groups").delete().eq("id", groupId);
    toast.success("Grupo excluído"); setConfirmDelete(null); setDeleting(false); fetchGroups();
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    const ids = [...selected];
    await (supabase as any).from("groups").delete().in("id", ids);
    toast.success(`${ids.length} grupo(s) excluído(s)`);
    setSelected(new Set()); setConfirmBulkDelete(false); setDeleting(false); fetchGroups();
  };

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) || g.category.toLowerCase().includes(search.toLowerCase())
  );
  const pagination = usePagination(filtered, 15);

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((g) => g.id)));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{groups.length}</p><p className="text-xs text-muted-foreground">Total de Grupos</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Globe className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{groups.filter(g => g.privacy === "public").length}</p><p className="text-xs text-muted-foreground">Grupos Públicos</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Lock className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{groups.filter(g => g.privacy === "private").length}</p><p className="text-xs text-muted-foreground">Grupos Privados</p></div>
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
            <CardTitle className="text-base">Todos os Grupos</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Pesquisar grupos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
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
                  <TableHead>Grupo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Privacidade</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead>Criador</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedItems.map((group) => (
                  <TableRow key={group.id} className={selected.has(group.id) ? "bg-primary/5" : ""}>
                    <TableCell><Checkbox checked={selected.has(group.id)} onCheckedChange={() => toggleSelect(group.id)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {group.avatar_url ? (
                          <img src={group.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
                        )}
                        <span className="font-medium text-sm">{group.name}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{group.category}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={group.privacy === "public" ? "outline" : "secondary"} className="text-xs">
                        {group.privacy === "public" ? <Globe className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                        {group.privacy === "public" ? "Público" : "Privado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{group.member_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{group.creator_name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleViewMembers(group)}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> Membros
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleEditGroup(group)}>
                          <Settings className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => setConfirmDelete(group.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pagination.paginatedItems.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum grupo encontrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination {...pagination} onPageChange={pagination.setCurrentPage} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Members Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={(open) => !open && setSelectedGroup(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Membros — {selectedGroup?.name}</DialogTitle></DialogHeader>
          {membersLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-2">
              {members.filter(m => m.status === "pending").length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Solicitações Pendentes</p>
                  {members.filter(m => m.status === "pending").map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 mb-1">
                      <span className="text-sm font-medium">{m.display_name}</span>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleApproveMember(m.id)}>Aprovar</Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleRemoveMember(m.id)}>Rejeitar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {members.filter(m => m.status === "approved").map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
                      )}
                      {m.role === "admin" && <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5"><Crown className="w-2.5 h-2.5" /></span>}
                      {m.role === "moderator" && <span className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-0.5"><ShieldCheck className="w-2.5 h-2.5" /></span>}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.display_name}</p>
                      <Badge variant="outline" className="text-[10px] h-4">
                        {m.role === "admin" ? "Administrador" : m.role === "moderator" ? "Moderador" : "Membro"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {m.role !== "admin" && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleSetRole(m.id, "admin")} title="Tornar Administrador"><Crown className="w-3.5 h-3.5 text-primary" /></Button>}
                    {m.role !== "moderator" && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleSetRole(m.id, "moderator")} title="Tornar Moderador"><ShieldCheck className="w-3.5 h-3.5 text-amber-600" /></Button>}
                    {m.role !== "member" && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleSetRole(m.id, "member")} title="Rebaixar"><Shield className="w-3.5 h-3.5 text-muted-foreground" /></Button>}
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleRemoveMember(m.id)} title="Remover"><UserMinus className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Grupo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" maxLength={100} />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full mt-1 px-3 py-2 bg-secondary rounded-lg text-sm border-none outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={3} maxLength={500} />
            </div>
            <div>
              <label className="text-sm font-medium">Privacidade</label>
              <Select value={editPrivacy} onValueChange={setEditPrivacy}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Público</SelectItem>
                  <SelectItem value="private">Privado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROUP_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveGroup} disabled={!editName.trim() || saving} className="w-full">
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Excluir Grupo"
        description="Tem certeza de que deseja excluir este grupo? Todas as publicações e membros serão removidos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => confirmDelete && handleDeleteGroup(confirmDelete)}
        loading={deleting}
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title="Excluir Grupos Selecionados"
        description={`Tem certeza de que deseja excluir ${selected.size} grupo(s)? Esta ação não pode ser desfeita.`}
        confirmLabel={`Excluir ${selected.size} Grupos`}
        onConfirm={handleBulkDelete}
        loading={deleting}
      />
    </div>
  );
};

export default AdminGroupsManagement;
