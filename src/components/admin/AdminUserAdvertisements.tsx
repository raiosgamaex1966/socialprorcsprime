import { useState } from "react";
import TablePagination, { usePagination } from "@/components/admin/TablePagination";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Megaphone, Search, Eye, Trash2, Ban, CheckCircle,
  ExternalLink, DollarSign, Calendar, Filter, TrendingUp, MousePointerClick,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AdminUserAdvertisements = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAd, setSelectedAd] = useState<any>(null);

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["admin-user-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsored_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch profiles for all unique user_ids
  const userIds = [...new Set(ads.map((a: any) => a.user_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-ad-profiles", userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  const profileMap = Object.fromEntries(
    profiles.map((p: any) => [p.user_id, p])
  );

  const filteredAds = ads.filter((ad: any) => {
    const profile = profileMap[ad.user_id];
    const matchesSearch =
      !search ||
      ad.content?.toLowerCase().includes(search.toLowerCase()) ||
      profile?.display_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && ad.is_active) ||
      (statusFilter === "inactive" && !ad.is_active);
    return matchesSearch && matchesStatus;
  });

  const pagination = usePagination(filteredAds, 15);

  const handleToggleActive = async (ad: any) => {
    const { error } = await supabase
      .from("sponsored_posts")
      .update({ is_active: !ad.is_active })
      .eq("id", ad.id);
    if (error) {
      toast.error("Falha ao atualizar o status do anúncio");
    } else {
      toast.success(ad.is_active ? "Anúncio desativado" : "Anúncio ativado");
      queryClient.invalidateQueries({ queryKey: ["admin-user-ads"] });
    }
  };

  const handleDelete = async (ad: any) => {
    const { error } = await supabase
      .from("sponsored_posts")
      .delete()
      .eq("id", ad.id);
    if (error) {
      toast.error("Falha ao excluir o anúncio");
    } else {
      toast.success("Anúncio excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-user-ads"] });
      setSelectedAd(null);
    }
  };

  const totalImpressions = ads.reduce((s: number, a: any) => s + (a.impressions || 0), 0);
  const totalCreditsSpent = ads.reduce((s: number, a: any) => s + (a.credits_spent || 0), 0);
  const activeCount = ads.filter((a: any) => a.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          Gerenciar Anúncios de Usuários
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Revise, aprove e gerencie publicações patrocinadas e campanhas publicitárias criadas por usuários.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{ads.length}</p>
              <p className="text-[10px] text-muted-foreground">Total de Anúncios</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{activeCount}</p>
              <p className="text-[10px] text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{totalImpressions.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Impressões</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{totalCreditsSpent.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Créditos Gastos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por conteúdo ou anunciante..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Anúncios</SelectItem>
            <SelectItem value="active">Apenas Ativos</SelectItem>
            <SelectItem value="inactive">Apenas Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando anúncios...</div>
      ) : filteredAds.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <Megaphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-foreground font-medium">Nenhum anúncio encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || statusFilter !== "all" ? "Tente ajustar seus filtros." : "Nenhum usuário criou anúncios ainda."}
          </p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Anunciante</TableHead>
                  <TableHead className="text-xs">Conteúdo</TableHead>
                  <TableHead className="text-xs text-center">Status</TableHead>
                  <TableHead className="text-xs text-right">Impressões</TableHead>
                  <TableHead className="text-xs text-right">Cliques</TableHead>
                  <TableHead className="text-xs text-right">CTR</TableHead>
                  <TableHead className="text-xs text-right">Créditos</TableHead>
                  <TableHead className="text-xs">Duração</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedItems.map((ad: any) => {
                  const profile = profileMap[ad.user_id];
                  const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0";
                  const isExpired = new Date(ad.end_date) < new Date();
                  return (
                    <TableRow key={ad.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedAd(ad)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={profile?.avatar_url || ""} />
                            <AvatarFallback className="text-[10px]">
                              {(profile?.display_name || "U")[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                            {profile?.display_name || "Desconhecido"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-foreground truncate max-w-[200px]">{ad.content}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        {isExpired ? (
                          <Badge variant="outline" className="text-[10px]">Expirado</Badge>
                        ) : ad.is_active ? (
                          <Badge className="text-[10px] bg-green-600">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{(ad.impressions || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{(ad.clicks || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{ctr}%</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{(ad.credits_spent || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {format(new Date(ad.start_date), "dd/MM/yyyy")} – {format(new Date(ad.end_date), "dd/MM/yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleToggleActive(ad)}
                            title={ad.is_active ? "Desativar" : "Ativar"}
                          >
                            {ad.is_active ? <Ban className="w-3.5 h-3.5 text-amber-500" /> : <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(ad)}
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 pb-4">
            <TablePagination {...pagination} onPageChange={pagination.setCurrentPage} />
          </div>
        </Card>
      )}

      {/* Ad Detail Dialog */}
      <Dialog open={!!selectedAd} onOpenChange={(o) => !o && setSelectedAd(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Megaphone className="w-4 h-4 text-primary" />
              Detalhes do Anúncio
            </DialogTitle>
          </DialogHeader>
          {selectedAd && (() => {
            const profile = profileMap[selectedAd.user_id];
            const ctr = selectedAd.impressions > 0
              ? ((selectedAd.clicks / selectedAd.impressions) * 100).toFixed(2)
              : "0.00";
            return (
              <div className="space-y-4">
                {/* Advertiser */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback>{(profile?.display_name || "U")[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{profile?.display_name || "Usuário Desconhecido"}</p>
                    <p className="text-[10px] text-muted-foreground">Criado em {format(new Date(selectedAd.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  <Badge className="ml-auto text-[10px]" variant={selectedAd.is_active ? "default" : "secondary"}>
                    {selectedAd.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conteúdo do Anúncio</p>
                  <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">{selectedAd.content}</p>
                </div>

                {selectedAd.image_url && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Imagem</p>
                    <img src={selectedAd.image_url} alt="Anúncio" className="rounded-lg max-h-40 object-cover w-full" />
                  </div>
                )}

                {selectedAd.link_url && (
                  <div className="flex items-center gap-2 text-xs">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    <a href={selectedAd.link_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                      {selectedAd.link_url}
                    </a>
                  </div>
                )}

                {/* Performance */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <Eye className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-bold text-foreground">{(selectedAd.impressions || 0).toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Impressões</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <MousePointerClick className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-bold text-foreground">{(selectedAd.clicks || 0).toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Cliques</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <TrendingUp className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-bold text-foreground">{ctr}%</p>
                    <p className="text-[9px] text-muted-foreground">CTR</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <DollarSign className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-bold text-foreground">{(selectedAd.credits_spent || 0).toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Créditos</p>
                  </div>
                </div>

                {/* Targeting */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Direcionamento</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAd.target_category && (
                      <Badge variant="outline" className="text-[10px]">Categoria: {selectedAd.target_category}</Badge>
                    )}
                    {selectedAd.target_location && (
                      <Badge variant="outline" className="text-[10px]">Localização: {selectedAd.target_location}</Badge>
                    )}
                    {selectedAd.target_gender && (
                      <Badge variant="outline" className="text-[10px]">Gênero: {selectedAd.target_gender}</Badge>
                    )}
                    {selectedAd.target_age_min && (
                      <Badge variant="outline" className="text-[10px]">Idade: {selectedAd.target_age_min}–{selectedAd.target_age_max || "∞"}</Badge>
                    )}
                    {!selectedAd.target_category && !selectedAd.target_location && !selectedAd.target_gender && !selectedAd.target_age_min && (
                      <span className="text-xs text-muted-foreground">Sem direcionamento — exibido para todos os usuários</span>
                    )}
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(selectedAd.start_date), "dd/MM/yyyy")} — {format(new Date(selectedAd.end_date), "dd/MM/yyyy")}
                  <span className="ml-1">
                    (Limite de freq: {selectedAd.frequency_cap || "nenhum"})
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant={selectedAd.is_active ? "destructive" : "default"}
                    size="sm"
                    className="gap-1.5 flex-1"
                    onClick={() => {
                      handleToggleActive(selectedAd);
                      setSelectedAd({ ...selectedAd, is_active: !selectedAd.is_active });
                    }}
                  >
                    {selectedAd.is_active ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    {selectedAd.is_active ? "Desativar Anúncio" : "Ativar Anúncio"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(selectedAd)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserAdvertisements;
