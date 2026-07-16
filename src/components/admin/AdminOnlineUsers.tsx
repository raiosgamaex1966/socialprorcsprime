import { useState } from "react";
import TablePagination, { usePagination } from "@/components/admin/TablePagination";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, RefreshCw, Wifi, WifiOff, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type StatusFilter = "all" | "online" | "recent" | "offline";

const AdminOnlineUsers = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: users = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-online-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, last_seen_at")
        .order("last_seen_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const now = new Date();
  const getStatus = (lastSeen: string | null) => {
    if (!lastSeen) return "offline";
    const diff = now.getTime() - new Date(lastSeen).getTime();
    if (diff < 2 * 60 * 1000) return "online";
    if (diff < 15 * 60 * 1000) return "recent";
    return "offline";
  };

  const onlineCount = users.filter((u) => getStatus(u.last_seen_at) === "online").length;
  const recentCount = users.filter((u) => getStatus(u.last_seen_at) === "recent").length;
  const offlineCount = users.filter((u) => getStatus(u.last_seen_at) === "offline").length;

  const filtered = users.filter((u) => {
    const status = getStatus(u.last_seen_at);
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (search && !(u.display_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pagination = usePagination(filtered, 15);

  const statusDot = (status: string) => {
    if (status === "online") return <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />;
    if (status === "recent") return <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />;
    return <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 inline-block" />;
  };

  const statusLabel = (status: string) => {
    if (status === "online") return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">Online</Badge>;
    if (status === "recent") return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">Ausente</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Offline</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total de Usuários", value: users.length, icon: Users, color: "text-primary" },
          { label: "Online Agora", value: onlineCount, icon: Wifi, color: "text-green-500" },
          { label: "Ausentes", value: recentCount, icon: Clock, color: "text-amber-500" },
          { label: "Offline", value: offlineCount, icon: WifiOff, color: "text-muted-foreground" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3 flex flex-col items-center text-center gap-1">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-1`} />
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Atividade dos Usuários</CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar usuários..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(["all", "online", "recent", "offline"] as StatusFilter[]).map((f) => (
                <Button
                  key={f}
                  variant={statusFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(f)}
                  className="text-xs"
                >
                  {f === "all" ? "Todos" : f === "online" ? "Online" : f === "recent" ? "Ausentes" : "Offline"}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última Atividade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.map((u) => {
                    const status = getStatus(u.last_seen_at);
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={u.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {(u.display_name || "?").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="absolute -bottom-0.5 -right-0.5">
                                {statusDot(status)}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                              {u.display_name || "Usuário Desconhecido"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{statusLabel(status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.last_seen_at
                            ? formatDistanceToNow(new Date(u.last_seen_at), { addSuffix: true, locale: ptBR })
                            : "Nunca"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <TablePagination {...pagination} onPageChange={pagination.setCurrentPage} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOnlineUsers;
