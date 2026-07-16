import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Megaphone, Plus, BarChart3, Coins, Target, Eye, MousePointerClick, TrendingUp, Pencil, Trash2, Pause, Play, ExternalLink, Calendar, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AppPageShell from "@/components/AppPageShell";
import AdPerformanceDashboard from "@/components/AdPerformanceDashboard";
import CreateSponsoredPost from "@/components/CreateSponsoredPost";
import EditSponsoredPostModal from "@/components/EditSponsoredPostModal";
import PromotionCreditsWidget from "@/components/PromotionCreditsWidget";
import { useMyAds } from "@/hooks/useMyAds";
import { useSponsoredPosts } from "@/hooks/useSponsoredPosts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";

const getAdStatus = (ad: any) => {
  const now = new Date();
  if (new Date(ad.end_date) < now) return "expired";
  if (!ad.is_active) return "paused";
  if (new Date(ad.start_date) > now) return "scheduled";
  return "active";
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  paused: { label: "Pausado", variant: "secondary" },
  expired: { label: "Expirado", variant: "destructive" },
  scheduled: { label: "Agendado", variant: "outline" },
};

const Advertising = () => {
  const [searchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(searchParams.get("create") === "true");
  const [editingAd, setEditingAd] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const { data: activePosts = [] } = useSponsoredPosts();
  const { data: myAds = [], toggleActive, deleteAd, updateAd } = useMyAds();

  const filteredAds = filter === "all" ? myAds : myAds.filter((ad: any) => getAdStatus(ad) === filter);

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteAd.mutate(id, { onSettled: () => setDeletingId(null) });
  };

  return (
    <AppPageShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            Anúncios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie, gerencie e acompanhe suas publicações patrocinadas e promoções.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Criar Anúncio
        </Button>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="w-fit">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Painel
          </TabsTrigger>
          <TabsTrigger value="ads" className="gap-1.5">
            <Megaphone className="w-4 h-4" />
            Meus Anúncios
            {myAds.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{myAds.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="credits" className="gap-1.5">
            <Coins className="w-4 h-4" />
            Créditos
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg bg-card shadow-sm p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Megaphone className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{activePosts.length}</p>
              <p className="text-xs text-muted-foreground">Anúncios Ativos</p>
            </div>
            <div className="rounded-lg bg-card shadow-sm p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {activePosts.reduce((s: number, p: any) => s + (p.impressions || 0), 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total de Impressões</p>
            </div>
            <div className="rounded-lg bg-card shadow-sm p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <MousePointerClick className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {activePosts.reduce((s: number, p: any) => s + (p.clicks || 0), 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total de Cliques</p>
            </div>
            <div className="rounded-lg bg-card shadow-sm p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {(() => {
                  const imp = activePosts.reduce((s: number, p: any) => s + (p.impressions || 0), 0);
                  const clk = activePosts.reduce((s: number, p: any) => s + (p.clicks || 0), 0);
                  return imp > 0 ? ((clk / imp) * 100).toFixed(1) : "0.0";
                })()}%
              </p>
              <p className="text-xs text-muted-foreground">CTR Médio</p>
            </div>
          </div>
          <AdPerformanceDashboard />
          {activePosts.length === 0 && (
            <div className="text-center py-16 rounded-xl border border-dashed border-border">
              <Megaphone className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-medium text-foreground">Nenhum anúncio ativo</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Crie sua primeira publicação patrocinada para alcançar mais pessoas.
              </p>
              <Button onClick={() => setShowCreate(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Criar Anúncio
              </Button>
            </div>
          )}
        </TabsContent>

        {/* My Ads Tab */}
        <TabsContent value="ads" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground">Meus Anúncios</h2>
              <div className="flex gap-1">
                {["all", "active", "paused", "expired"].map((f) => {
                  const labels: Record<string, string> = { all: "Todos", active: "Ativos", paused: "Pausados", expired: "Expirados" };
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                        filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {labels[f]} {f !== "all" && `(${myAds.filter((a: any) => getAdStatus(a) === f).length})`}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Novo Anúncio
            </Button>
          </div>

          {filteredAds.length > 0 ? (
            <div className="space-y-3">
              {filteredAds.map((ad: any) => {
                const status = getAdStatus(ad);
                const cfg = statusConfig[status];
                const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0";

                return (
                  <div key={ad.id} className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="p-4">
                      {/* Top row: status + actions */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                          {ad.target_category && (
                            <Badge variant="outline" className="text-[10px] gap-0.5">
                              <Target className="w-2.5 h-2.5" /> {ad.target_category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {status !== "expired" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => toggleActive.mutate({ id: ad.id, is_active: !ad.is_active })}
                              title={ad.is_active ? "Pausar" : "Ativar"}
                            >
                              {ad.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setEditingAd(ad)}
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(ad.id)}
                            disabled={deletingId === ad.id}
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-sm text-foreground leading-relaxed mb-2 line-clamp-3">{ad.content}</p>

                      {ad.image_url && (
                        <div className="rounded-lg overflow-hidden border border-border mb-3">
                          <img src={ad.image_url} alt="" className="w-full max-h-48 object-cover" />
                        </div>
                      )}

                      {ad.link_url && (
                        <a
                          href={ad.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mb-3"
                        >
                          <ExternalLink className="w-3 h-3" /> {ad.link_url}
                        </a>
                      )}

                      {/* Stats row */}
                      <div className="flex items-center gap-4 pt-3 border-t border-border">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="font-medium text-foreground">{(ad.impressions || 0).toLocaleString()}</span> impressões
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MousePointerClick className="w-3.5 h-3.5" />
                          <span className="font-medium text-foreground">{(ad.clicks || 0).toLocaleString()}</span> cliques
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span className="font-medium text-foreground">{ctr}%</span> CTR
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-medium text-foreground">{ad.credits_spent}</span>
                        </div>
                      </div>

                      {/* Date row */}
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(ad.start_date), "MMM d")} – {format(new Date(ad.end_date), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 rounded-xl border border-dashed border-border">
              <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-foreground font-medium">
                {filter === "all" ? "Nenhuma publicação patrocinada ainda" : `Sem anúncios ${statusConfig[filter]?.label.toLowerCase() || filter}`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {filter === "all" ? "Crie uma para começar a alcançar seu público." : "Tente um filtro diferente."}
              </p>
            </div>
          )}
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-6">
          <div className="max-w-md">
            <PromotionCreditsWidget />
          </div>
          <div className="rounded-lg bg-card shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Como Funcionam os Créditos</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Use créditos para criar publicações patrocinadas que aparecem no feed de todos.</p>
              <p>• Promova classificados do marketplace para obter mais visibilidade e vendas mais rápidas.</p>
              <p>• Direcione a categorias e localizações específicas para melhores resultados.</p>
              <p>• Defina limites de frequência para controlar quantas vezes os usuários veem seus anúncios.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {showCreate && <CreateSponsoredPost onClose={() => setShowCreate(false)} />}
      {editingAd && (
        <EditSponsoredPostModal
          post={editingAd}
          onClose={() => setEditingAd(null)}
          saving={updateAd.isPending}
          onSave={(updates) => {
            updateAd.mutate(updates, { onSuccess: () => setEditingAd(null) });
          }}
        />
      )}
    </AppPageShell>
  );
};

export default Advertising;
