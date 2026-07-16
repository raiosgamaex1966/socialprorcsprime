import { useState, useEffect } from "react";
import TablePagination, { usePagination } from "@/components/admin/TablePagination";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { BadgeCheck, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface VerifiedSeller {
  id: string;
  user_id: string;
  verified_at: string;
  verification_type: string;
  criteria_met: any;
  profile?: { display_name: string | null; avatar_url: string | null };
}

const AdminVerifiedSellers = () => {
  const [sellers, setSellers] = useState<VerifiedSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningDetection, setRunningDetection] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [confirmBulkRevoke, setConfirmBulkRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const pagination = usePagination(sellers, 15);

  const fetchSellers = async () => {
    setLoading(true);
    const { data } = await supabase.from("verified_sellers").select("*").order("verified_at", { ascending: false });
    if (data?.length) {
      const userIds = data.map((s: any) => s.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.user_id, p]));
      setSellers(data.map((s: any) => ({ ...s, profile: profileMap[s.user_id] })));
    } else { setSellers([]); }
    setLoading(false);
  };

  useEffect(() => { fetchSellers(); }, []);

  const handleRevoke = async (id: string) => {
    setRevoking(true);
    const { error } = await (supabase as any).from("verified_sellers").delete().eq("id", id);
    if (error) {
      toast.error("Falha ao revogar verificação");
    } else {
      toast.success("Verificação revogada");
      setSellers((prev) => prev.filter((s) => s.id !== id));
    }
    setConfirmRevoke(null); setRevoking(false);
  };

  const handleBulkRevoke = async () => {
    setRevoking(true);
    const ids = [...selected];
    await (supabase as any).from("verified_sellers").delete().in("id", ids);
    toast.success(`${ids.length} verificação(ões) revogada(s)`);
    setSellers((prev) => prev.filter((s) => !ids.includes(s.id)));
    setSelected(new Set()); setConfirmBulkRevoke(false); setRevoking(false);
  };

  const handleRunAutoVerify = async () => {
    setRunningDetection(true);
    try {
      const res = await supabase.functions.invoke("auto-verify-sellers");
      if (res.error) throw res.error;
      toast.success(`Verificação automática concluída: ${res.data?.verified || 0} novos vendedores verificados`);
      fetchSellers();
    } catch {
      toast.error("Falha na verificação automática");
    }
    setRunningDetection(false);
  };

  const toggleSelect = (id: string) => { setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const toggleAll = () => { if (selected.size === sellers.length) setSelected(new Set()); else setSelected(new Set(sellers.map((s) => s.id))); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><BadgeCheck className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-bold text-foreground">{sellers.length}</p><p className="text-xs text-muted-foreground">Vendedores Verificados</p></div>
          </CardContent>
        </Card>
        <Button variant="outline" size="sm" className="ml-4" onClick={handleRunAutoVerify} disabled={runningDetection}>
          <RefreshCw className={`w-4 h-4 mr-1 ${runningDetection ? "animate-spin" : ""}`} />
          {runningDetection ? "Executando..." : "Verificação Automática"}
        </Button>
      </div>

      <BulkActionsBar
        selectedCount={selected.size}
        totalCount={sellers.length}
        onSelectAll={toggleAll}
        onClearSelection={() => setSelected(new Set())}
        allSelected={selected.size === sellers.length && sellers.length > 0}
        actions={[
          { label: `Revogar ${selected.size}`, onClick: () => setConfirmBulkRevoke(true), variant: "destructive", icon: <Trash2 className="w-3.5 h-3.5 mr-1" /> },
        ]}
      />

      <Card>
        <CardHeader><CardTitle className="text-lg">Vendedores Verificados</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : sellers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BadgeCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Nenhum vendedor verificado ainda</p>
              <p className="text-xs mt-1">Execute a verificação automática ou verifique vendedores manualmente.</p>
            </div>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selected.size === sellers.length && sellers.length > 0} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Critérios</TableHead>
                  <TableHead>Verificado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedItems.map((seller) => (
                  <TableRow key={seller.id} className={selected.has(seller.id) ? "bg-primary/5" : ""}>
                    <TableCell><Checkbox checked={selected.has(seller.id)} onCheckedChange={() => toggleSelect(seller.id)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={seller.profile?.avatar_url || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{(seller.profile?.display_name || "?")[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{seller.profile?.display_name || "Desconhecido"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={seller.verification_type === "auto" ? "secondary" : "default"} className="text-[10px]">
                        {seller.verification_type === "auto" ? "Automático" : "Manual"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {seller.criteria_met ? `${seller.criteria_met.listings || 0} anúncios, ${seller.criteria_met.reviews || 0} avaliações, ★${seller.criteria_met.avg_rating || "N/A"}` : "Manual"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(seller.verified_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmRevoke(seller.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Revogar
                      </Button>
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

      <ConfirmDialog open={!!confirmRevoke} onOpenChange={(open) => !open && setConfirmRevoke(null)} title="Revogar Verificação" description="Tem certeza de que deseja revogar a verificação deste vendedor?" confirmLabel="Revogar" onConfirm={() => confirmRevoke && handleRevoke(confirmRevoke)} loading={revoking} />
      <ConfirmDialog open={confirmBulkRevoke} onOpenChange={setConfirmBulkRevoke} title="Revogar Verificações Selecionadas" description={`Revogar verificação de ${selected.size} vendedor(es)?`} confirmLabel={`Revogar ${selected.size}`} onConfirm={handleBulkRevoke} loading={revoking} />
    </div>
  );
};

export default AdminVerifiedSellers;
