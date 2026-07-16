import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, Users, Globe, Lock, Tag, X, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GROUP_CATEGORIES } from "@/constants/groupCategories";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import CreateGroup from "@/components/CreateGroup";
import GroupCard from "@/components/GroupCard";
import GroupRecommendations from "@/components/GroupRecommendations";
import HorizontalBannerAd from "@/components/ads/HorizontalBannerAd";
import AppPageShell from "@/components/AppPageShell";

const Groups = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<"your" | "my" | "discover">((searchParams.get("tab") as any) || "your");
  const [showSearch, setShowSearch] = useState(!!searchParams.get("search"));
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [showCreate, setShowCreate] = useState(searchParams.get("create") === "true");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get("category") || null);
  const [sortBy, setSortBy] = useState<"recent" | "members" | "trending">("recent");

  // Fetch all groups with member counts
  const { data: allGroups } = useQuery({
    queryKey: ["groups", search],
    queryFn: async () => {
      let query = supabase.from("groups").select("*").order("created_at", { ascending: false });
      if (search.trim()) {
        query = query.ilike("name", `%${search.trim()}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Fetch user's group memberships
  const { data: myMemberships } = useQuery({
    queryKey: ["my-groups", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, role, status")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Fetch member counts for all groups
  const groupIds = allGroups?.map((g: any) => g.id) || [];
  const { data: memberCounts } = useQuery({
    queryKey: ["group-member-counts", groupIds],
    queryFn: async () => {
      if (!groupIds.length) return {};
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id")
        .in("group_id", groupIds)
        .eq("status", "approved");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((m: any) => {
        counts[m.group_id] = (counts[m.group_id] || 0) + 1;
      });
      return counts;
    },
    enabled: groupIds.length > 0,
  });

  // Fetch recent post counts (last 7 days) to determine trending groups
  const { data: trendingGroupIds } = useQuery({
    queryKey: ["trending-groups", groupIds],
    queryFn: async () => {
      if (!groupIds.length) return new Set<string>();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("group_posts")
        .select("group_id")
        .in("group_id", groupIds)
        .gte("created_at", weekAgo);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        counts[p.group_id] = (counts[p.group_id] || 0) + 1;
      });
      // Groups with 3+ posts in the last week are "trending"
      return new Set(Object.entries(counts).filter(([, c]) => c >= 3).map(([id]) => id));
    },
    enabled: groupIds.length > 0,
  });

  const membershipMap = new Map((myMemberships || []).map((m: any) => [m.group_id, m]));

  // "Your Groups" = groups you created
  const yourGroups = allGroups?.filter((g: any) => g.created_by === user?.id) || [];

  // "My Groups" = groups you're a member of (but didn't create)
  const myGroups = allGroups?.filter((g: any) => {
    const m = membershipMap.get(g.id);
    return m && m.status === "approved" && g.created_by !== user?.id;
  }) || [];

  const discoverGroups = allGroups?.filter((g: any) => {
    const m = membershipMap.get(g.id);
    return !m || m.status === "pending";
  }) || [];

  const activeGroups = tab === "your" ? yourGroups : tab === "my" ? myGroups : discoverGroups;

  const filteredGroups = activeGroups.filter(
    (g: any) => !selectedCategory || g.category === selectedCategory
  );

  const displayGroups = [...filteredGroups].sort((a: any, b: any) => {
    if (sortBy === "members") {
      return (memberCounts?.[b.id] || 0) - (memberCounts?.[a.id] || 0);
    }
    if (sortBy === "trending") {
      const aTrending = trendingGroupIds?.has(a.id) ? 1 : 0;
      const bTrending = trendingGroupIds?.has(b.id) ? 1 : 0;
      if (bTrending !== aTrending) return bTrending - aTrending;
      return (memberCounts?.[b.id] || 0) - (memberCounts?.[a.id] || 0);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleJoin = async (groupId: string) => {
    if (!user) return;
    setJoiningId(groupId);
    try {
      const group = allGroups?.find((g: any) => g.id === groupId);
      const status = group?.privacy === "private" ? "pending" : "approved";
      const { error } = await supabase
        .from("group_members")
        .insert({ group_id: groupId, user_id: user.id, status });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      queryClient.invalidateQueries({ queryKey: ["group-member-counts"] });
      toast.success(status === "pending" ? "Solicitação de entrada enviada!" : "Entrou no grupo!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao entrar no grupo");
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <>
      <AppPageShell as="div">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            Grupos
          </h1>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="w-4 h-4" />
            Criar Grupo
          </Button>
        </div>

        {/* Tabs + Filters (single row) */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex bg-secondary rounded-lg p-1">
            <button
              onClick={() => setTab("your")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === "your" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Seus Grupos
            </button>
            <button
              onClick={() => setTab("my")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === "my" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Meus Grupos
            </button>
            <button
              onClick={() => setTab("discover")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === "discover" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Descobrir
            </button>
          </div>

          <Select value={selectedCategory || "all"} onValueChange={(val) => setSelectedCategory(val === "all" ? null : val)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todas as Categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {GROUP_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(val) => setSortBy(val as "recent" | "members" | "trending")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais Recentes</SelectItem>
              <SelectItem value="members">Mais Membros</SelectItem>
              <SelectItem value="trending">Populares Primeiro</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 ml-auto"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Expandable Search */}
        {showSearch && (
          <div className="relative mb-5 animate-fade-in">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar grupos..."
              autoFocus
              className="w-full pl-9 pr-9 py-2 bg-secondary rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => { setShowSearch(false); setSearch(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        )}

        {/* Banner Ad */}
        <HorizontalBannerAd variant="slim" className="mb-5" />

        {/* Recommendations (only on Discover tab) */}
        {tab === "discover" && (
          <GroupRecommendations
            onJoin={handleJoin}
            joiningId={joiningId}
            membershipMap={membershipMap}
            memberCounts={memberCounts}
            trendingGroupIds={trendingGroupIds}
          />
        )}

        {/* Groups Grid */}
        {displayGroups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayGroups.map((group: any) => (
              <GroupCard
                key={group.id}
                id={group.id}
                name={group.name}
                description={group.description}
                avatarUrl={group.avatar_url}
                coverPhotoUrl={group.cover_photo_url}
                privacy={group.privacy}
                category={group.category}
                memberCount={memberCounts?.[group.id] || 0}
                isMember={membershipMap.get(group.id)?.status === "approved"}
                onJoin={handleJoin}
                joining={joiningId === group.id}
                trending={trendingGroupIds?.has(group.id) || false}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-sm p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {tab === "your" ? "Você ainda não criou nenhum grupo" : tab === "my" ? "Você ainda não entrou em nenhum grupo" : "Nenhum grupo para descobrir"}
            </p>
            {(tab === "your" || tab === "my") && (
              <button
                onClick={() => tab === "your" ? setShowCreate(true) : setTab("discover")}
                className="mt-2 text-sm text-primary font-semibold hover:text-primary/80"
              >
                {tab === "your" ? "Criar um grupo →" : "Descobrir grupos →"}
              </button>
            )}
          </div>
        )}
      </AppPageShell>
      <CreateGroup open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
};

export default Groups;
