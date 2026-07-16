import { useState, useEffect } from "react";
import TablePagination, { usePagination } from "@/components/admin/TablePagination";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, ShieldCheck, UserX, Eye, Pencil, Trash2, Save, Gift } from "lucide-react";
import { toast } from "sonner";
import GiftCreditsModal from "@/components/GiftCreditsModal";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  bio: string | null;
  location: string | null;
  website: string | null;
  phone: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  moderator: "Moderador",
  user: "Usuário",
};

const AdminUserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [roleToAssign, setRoleToAssign] = useState("user");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: "", bio: "", location: "", website: "", phone: "" });
  const [saving, setSaving] = useState(false);

  // Confirm dialogs
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [giftCreditsOpen, setGiftCreditsOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, created_at, bio, location, website, phone")
      .order("created_at", { ascending: false });
    setUsers(data || []);

    const { data: roles } = await (supabase as any)
      .from("user_roles")
      .select("user_id, role");
    const roleMap: Record<string, string[]> = {};
    (roles || []).forEach((r: any) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });
    setUserRoles(roleMap);
    setLoading(false);
  };

  const fetchBlockedUsers = async () => {
    const { data } = await supabase
      .from("blocked_users")
      .select("*")
      .order("created_at", { ascending: false });
    setBlockedUsers(data || []);
  };

  useEffect(() => {
    fetchUsers();
    fetchBlockedUsers();
  }, []);

  const handleAssignRole = async (userId: string, role: string) => {
    const { error } = await (supabase as any)
      .from("user_roles")
      .insert({ user_id: userId, role });
    if (error) {
      if (error.code === "23505") toast.error("O usuário já possui esta função");
      else toast.error("Falha ao atribuir função");
    } else {
      toast.success(`Função "${ROLE_LABELS[role] || role}" atribuída`);
      fetchUsers();
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    const { error } = await (supabase as any)
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);
    if (error) {
      toast.error("Falha ao remover função");
    } else {
      toast.success(`Função "${ROLE_LABELS[role] || role}" removida`);
      fetchUsers();
    }
  };

  const openEditMode = (user: UserProfile) => {
    setEditMode(true);
    setEditForm({
      display_name: user.display_name || "",
      bio: user.bio || "",
      location: user.location || "",
      website: user.website || "",
      phone: user.phone || "",
    });
  };

  const handleSaveProfile = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: editForm.display_name || null,
        bio: editForm.bio || null,
        location: editForm.location || null,
        website: editForm.website || null,
        phone: editForm.phone || null,
      })
      .eq("user_id", selectedUser.user_id);
    setSaving(false);
    if (error) {
      toast.error("Falha ao atualizar perfil");
    } else {
      toast.success("Perfil atualizado");
      setEditMode(false);
      fetchUsers();
      setSelectedUser({ ...selectedUser, ...editForm });
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeleteLoading(true);
    // Delete roles first, then profile
    await (supabase as any).from("user_roles").delete().eq("user_id", selectedUser.user_id);
    const { error } = await supabase.from("profiles").delete().eq("user_id", selectedUser.user_id);
    setDeleteLoading(false);
    if (error) {
      toast.error("Falha ao excluir perfil do usuário");
    } else {
      toast.success("Perfil do usuário excluído");
      setSelectedUser(null);
      setConfirmDelete(false);
      fetchUsers();
    }
  };

  const handleBulkDelete = async () => {
    setDeleteLoading(true);
    const ids = [...selected];
    // Delete roles first
    await (supabase as any).from("user_roles").delete().in("user_id", ids);
    const { error } = await supabase.from("profiles").delete().in("user_id", ids);
    setDeleteLoading(false);
    if (error) {
      toast.error("Falha ao excluir usuários selecionados");
    } else {
      toast.success(`${ids.length} perfil(s) de usuário excluído(s)`);
      setSelected(new Set());
      setConfirmBulkDelete(false);
      fetchUsers();
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredUsers = users.filter((u) =>
    !search || (u.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const pagination = usePagination(filteredUsers, 15);
  const totalAdmins = Object.values(userRoles).filter((roles) => roles.includes("admin")).length;
  const totalModerators = Object.values(userRoles).filter((roles) => roles.includes("moderator")).length;

  return (
    <>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total de Usuários</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalAdmins}</p>
                <p className="text-xs text-muted-foreground">Administradores</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <UserX className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{blockedUsers.length}</p>
                <p className="text-xs text-muted-foreground">Registros de Bloqueio</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions */}
        <BulkActionsBar
          selectedCount={selected.size}
          totalCount={filteredUsers.length}
          allSelected={selected.size === filteredUsers.length && filteredUsers.length > 0}
          onSelectAll={() => setSelected(new Set(filteredUsers.map((u) => u.user_id)))}
          onClearSelection={() => setSelected(new Set())}
          actions={[
            {
              label: "Excluir Selecionados",
              variant: "destructive",
              icon: <Trash2 className="w-3.5 h-3.5 mr-1" />,
              onClick: () => setConfirmBulkDelete(true),
            },
          ]}
        />

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Todos os Usuários</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuários..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selected.size === filteredUsers.length && filteredUsers.length > 0}
                          onCheckedChange={(checked) =>
                            checked
                              ? setSelected(new Set(filteredUsers.map((u) => u.user_id)))
                              : setSelected(new Set())
                          }
                        />
                      </TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Funções</TableHead>
                      <TableHead>Cadastrado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagination.paginatedItems.map((user) => (
                      <TableRow
                        key={user.user_id}
                        className={selected.has(user.user_id) ? "bg-primary/5" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selected.has(user.user_id)}
                            onCheckedChange={() => toggleSelect(user.user_id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user.avatar_url || ""} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {(user.display_name || "?")[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm whitespace-nowrap">{user.display_name || "Desconhecido"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(userRoles[user.user_id] || []).map((role) => (
                              <Badge key={role} variant={role === "admin" ? "destructive" : "secondary"} className="text-[10px]">
                                {ROLE_LABELS[role] || role}
                              </Badge>
                            ))}
                            {!(userRoles[user.user_id]?.length) && (
                              <span className="text-xs text-muted-foreground">membro</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => { setSelectedUser(user); setEditMode(false); }}>
                              <Eye className="w-3.5 h-3.5 mr-1" /> Ver
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedUser(user); openEditMode(user); }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => { setSelectedUser(user); setConfirmDelete(true); }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination {...pagination} onPageChange={pagination.setCurrentPage} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User detail/edit dialog */}
      <Dialog open={!!selectedUser && !confirmDelete} onOpenChange={(o) => { if (!o) { setSelectedUser(null); setEditMode(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? "Editar Usuário" : "Gerenciar Usuário"}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedUser.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(selectedUser.display_name || "?")[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{selectedUser.display_name || "Desconhecido"}</p>
                  <p className="text-xs text-muted-foreground">Cadastrado em {new Date(selectedUser.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                {!editMode && (
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => openEditMode(selectedUser)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                )}
              </div>

              {editMode ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome de Exibição</Label>
                    <Input value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Biografia</Label>
                    <Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Localização</Label>
                      <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Telefone</Label>
                      <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Website</Label>
                    <Input value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSaveProfile} disabled={saving} className="flex-1">
                      <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditMode(false)} disabled={saving}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <>
                  {selectedUser.bio && (
                    <p className="text-sm text-muted-foreground">{selectedUser.bio}</p>
                  )}
                  {(selectedUser.location || selectedUser.website || selectedUser.phone) && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {selectedUser.location && <p>📍 {selectedUser.location}</p>}
                      {selectedUser.website && <p>🔗 {selectedUser.website}</p>}
                      {selectedUser.phone && <p>📞 {selectedUser.phone}</p>}
                    </div>
                  )}

                  {/* Roles section */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Funções</p>
                    <div className="flex flex-wrap gap-2">
                      {(userRoles[selectedUser.user_id] || []).map((role) => (
                        <Badge key={role} variant={role === "admin" ? "destructive" : "secondary"} className="gap-1">
                          {ROLE_LABELS[role] || role}
                          <button
                            onClick={() => handleRemoveRole(selectedUser.user_id, role)}
                            className="ml-1 hover:text-foreground"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Select value={roleToAssign} onValueChange={setRoleToAssign}>
                        <SelectTrigger className="h-9 w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuário</SelectItem>
                          <SelectItem value="moderator">Moderador</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => handleAssignRole(selectedUser.user_id, roleToAssign)}
                      >
                        Atribuir Função
                      </Button>
                    </div>
                  </div>

                   {/* Gift Credits button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => setGiftCreditsOpen(true)}
                  >
                    <Gift className="w-3.5 h-3.5 text-amber-500" /> Enviar Créditos de Presente
                  </Button>

                  {/* Delete button */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir Perfil do Usuário
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Single delete confirm */}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir Perfil do Usuário"
        description={`Tem certeza de que deseja excluir o perfil de "${selectedUser?.display_name || "este usuário"}"? Isso também removerá todas as suas funções. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDeleteUser}
        loading={deleteLoading}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title="Excluir Usuários Selecionados"
        description={`Tem certeza de que deseja excluir ${selected.size} perfil(s) de usuário? Isso também removerá todas as suas funções. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir Todos"
        variant="destructive"
        onConfirm={handleBulkDelete}
        loading={deleteLoading}
      />

      {/* Gift Credits Modal */}
      {selectedUser && (
        <GiftCreditsModal
          open={giftCreditsOpen}
          onOpenChange={setGiftCreditsOpen}
          recipientId={selectedUser.user_id}
          recipientName={selectedUser.display_name || "Usuário"}
          recipientAvatar={selectedUser.avatar_url || ""}
          isAdminGift
        />
      )}
    </>
  );
};

export default AdminUserManagement;
