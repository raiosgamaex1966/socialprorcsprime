import { useState } from "react";
import TablePagination, { usePagination } from "@/components/admin/TablePagination";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, CheckCircle, XCircle, Clock, User, Store, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AdminVerificationRequests = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["verification-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles for display names
  const userIds = [...new Set(requests.map((r: any) => r.user_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-for-verification", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: userIds.length > 0,
  });

  const profileMap = Object.fromEntries(
    profiles.map((p: any) => [p.user_id, p])
  );

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("verification_requests")
        .update({
          status,
          admin_note: note || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["verification-requests"] });
      const statusLabel = vars.status === "approved" ? "aprovada" : vars.status === "rejected" ? "rejeitada" : vars.status;
      toast.success(`Solicitação ${statusLabel}`);
      setSelectedRequest(null);
      setAdminNote("");
    },
    onError: () => toast.error("Falha ao atualizar a solicitação"),
  });

  const filtered = requests.filter((r: any) => {
    if (activeTab === "all") return true;
    return r.status === activeTab;
  });

  const counts = {
    pending: requests.filter((r: any) => r.status === "pending").length,
    approved: requests.filter((r: any) => r.status === "approved").length,
    rejected: requests.filter((r: any) => r.status === "rejected").length,
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-400"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case "approved":
        return <Badge variant="outline" className="text-green-600 border-green-400"><CheckCircle className="w-3 h-3 mr-1" />Aprovada</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-600 border-red-400"><XCircle className="w-3 h-3 mr-1" />Rejeitada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const typeBadge = (type: string) => {
    if (type === "seller") return <Badge variant="secondary"><Store className="w-3 h-3 mr-1" />Vendedor</Badge>;
    return <Badge variant="secondary"><User className="w-3 h-3 mr-1" />Perfil</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Gerenciar Solicitações de Verificação
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Revise e gerencie as solicitações de verificação de perfis e vendedores.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{counts.pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-green-600">{counts.approved}</p>
            <p className="text-xs text-muted-foreground">Aprovadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-red-600">{counts.rejected}</p>
            <p className="text-xs text-muted-foreground">Rejeitadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pendentes {counts.pending > 0 && `(${counts.pending})`}</TabsTrigger>
          <TabsTrigger value="approved">Aprovadas</TabsTrigger>
          <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Carregando solicitações...</p>}

          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8 font-medium">
              {activeTab === "pending"
                ? "Nenhuma solicitação de verificação pendente."
                : activeTab === "approved"
                ? "Nenhuma solicitação de verificação aprovada."
                : activeTab === "rejected"
                ? "Nenhuma solicitação de verificação rejeitada."
                : "Nenhuma solicitação de verificação encontrada."}
            </p>
          )}

          {filtered.map((req: any) => {
            const profile = profileMap[req.user_id];
            return (
              <Card key={req.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => { setSelectedRequest(req); setAdminNote(req.admin_note || ""); }}>
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback>{(profile?.display_name || "U")[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{req.full_name || profile?.display_name || "Usuário Desconhecido"}</p>
                    <p className="text-xs text-muted-foreground truncate">{req.reason || "Nenhuma justificativa fornecida"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {typeBadge(req.request_type)}
                    {statusBadge(req.status)}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(new Date(req.created_at), "dd/MM/yyyy")}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(o) => !o && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Detalhes da Solicitação de Verificação
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (() => {
            const profile = profileMap[selectedRequest.user_id];
            return (
              <div className="space-y-4">
                {/* User Info */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback>{(profile?.display_name || "U")[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{selectedRequest.full_name || profile?.display_name || "Desconhecido"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {typeBadge(selectedRequest.request_type)}
                      {statusBadge(selectedRequest.status)}
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Enviado em:</span>{" "}
                    {format(new Date(selectedRequest.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </div>
                  {selectedRequest.reason && (
                    <div>
                      <span className="text-muted-foreground">Justificativa:</span>
                      <p className="mt-0.5">{selectedRequest.reason}</p>
                    </div>
                  )}
                  {selectedRequest.document_url && (
                    <div>
                      <span className="text-muted-foreground">Documento:</span>
                      <a
                        href={selectedRequest.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline ml-1"
                      >
                        Visualizar Documento <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Admin Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Nota do Administrador</label>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Adicione uma observação para esta solicitação..."
                    className="text-sm"
                    rows={3}
                    disabled={selectedRequest.status !== "pending"}
                  />
                </div>

                {/* Actions */}
                {selectedRequest.status === "pending" && (
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: selectedRequest.id, status: "rejected", note: adminNote })}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: selectedRequest.id, status: "approved", note: adminNote })}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aprovar
                    </Button>
                  </div>
                )}

                {selectedRequest.status !== "pending" && selectedRequest.reviewed_at && (
                  <p className="text-xs text-muted-foreground">
                    Revisado em {format(new Date(selectedRequest.reviewed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVerificationRequests;
