import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Search, MapPin, Users, Flag, List, Map as MapIcon, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import EventCard from "@/components/EventCard";
import CreateEventModal from "@/components/CreateEventModal";
import { EVENT_CATEGORIES } from "@/constants/eventCategories";
import EventsMapView from "@/components/EventsMapView";
import { useSponsoredPosts } from "@/hooks/useSponsoredPosts";
import SponsoredPostCard from "@/components/SponsoredPostCard";
import HorizontalBannerAd from "@/components/ads/HorizontalBannerAd";
import AppPageShell from "@/components/AppPageShell";
import TablePagination, { usePagination } from "@/components/admin/TablePagination";

const Events = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { data: sponsoredPosts = [] } = useSponsoredPosts("events");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "groups" | "pages">((searchParams.get("source") as any) || "all");
  const [viewMode, setViewMode] = useState<"list" | "map">((searchParams.get("view") as any) || "list");
  const [showCreate, setShowCreate] = useState(searchParams.get("create") === "true");

  // Fetch all events the user can see
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["all-events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_events" as any)
        .select("*")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });
      if (error) throw error;

      const evts = data as any[];
      const userIds = [...new Set(evts.map((e: any) => e.created_by))];
      const groupIds = [...new Set(evts.filter((e: any) => e.group_id).map((e: any) => e.group_id))];
      const pageIds = [...new Set(evts.filter((e: any) => e.page_id).map((e: any) => e.page_id))];
      const eventIds = evts.map((e: any) => e.id);

      const [profilesRes, groupsRes, pagesRes, rsvpsRes] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds) : { data: [] },
        groupIds.length ? supabase.from("groups").select("id, name, avatar_url").in("id", groupIds) : { data: [] },
        pageIds.length ? supabase.from("pages").select("id, name, avatar_url, slug").in("id", pageIds) : { data: [] },
        eventIds.length ? supabase.from("group_event_rsvps").select("event_id, user_id, status").in("event_id", eventIds) : { data: [] },
      ]);

      // Fetch attendee profiles
      const rsvps = (rsvpsRes.data || []) as any[];
      const attendeeUserIds = [...new Set(rsvps.map((r: any) => r.user_id))];
      const attendeeProfilesRes = attendeeUserIds.length
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", attendeeUserIds)
        : { data: [] };
      const attendeeProfileMap = new Map((attendeeProfilesRes.data || []).map((p: any) => [p.user_id, p]));

      // Build per-event attendee data
      const eventAttendeesMap = new Map<string, { going: any[]; interested: any[]; total: number }>();
      for (const r of rsvps) {
        if (!eventAttendeesMap.has(r.event_id)) {
          eventAttendeesMap.set(r.event_id, { going: [], interested: [], total: 0 });
        }
        const entry = eventAttendeesMap.get(r.event_id)!;
        const profile = attendeeProfileMap.get(r.user_id);
        const attendee = { user_id: r.user_id, status: r.status, ...profile };
        if (r.status === "going") entry.going.push(attendee);
        else if (r.status === "interested") entry.interested.push(attendee);
        entry.total++;
      }

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
      const groupMap = new Map((groupsRes.data || []).map((g: any) => [g.id, g]));
      const pageMap = new Map((pagesRes.data || []).map((p: any) => [p.id, p]));

      return evts.map((e: any) => {
        const group = e.group_id ? groupMap.get(e.group_id) : null;
        const page = e.page_id ? pageMap.get(e.page_id) : null;
        const attendees = eventAttendeesMap.get(e.id) || { going: [], interested: [], total: 0 };
        return {
          ...e,
          profile: profileMap.get(e.created_by),
          source_name: group?.name || page?.name || null,
          source_type: e.group_id ? "group" : "page",
          source_avatar: group?.avatar_url || page?.avatar_url || null,
          source_slug: page?.slug || null,
          attendees,
        };
      });
    },
    enabled: !!user,
  });

  const filteredEvents = events.filter((e: any) => {
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    if (sourceFilter === "groups" && !e.group_id) return false;
    if (sourceFilter === "pages" && !e.page_id) return false;
    return true;
  });

  const { currentPage, totalPages, totalItems, pageSize, paginatedItems: paginatedEvents, setCurrentPage } = usePagination(filteredEvents, 12);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, sourceFilter]);

  const [showSearch, setShowSearch] = useState(!!search);

  const sourceTabs = [
    { key: "all" as const, label: "Todos os Eventos" },
    { key: "groups" as const, label: "Grupos" },
    { key: "pages" as const, label: "Páginas" },
  ];

  return (
    <AppPageShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="w-7 h-7 text-primary" />
          Eventos
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Criar Evento
        </button>
      </div>

      {/* Tabs + Filters (single row) */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex bg-secondary rounded-lg p-1">
          {sourceTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setSourceFilter(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                sourceFilter === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex bg-secondary rounded-lg p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-3.5 h-3.5" /> Lista
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              viewMode === "map" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" /> Mapa
          </button>
        </div>

        {/* Category filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="Todas as Categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {EVENT_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.icon} {cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowSearch((v) => !v)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar eventos..."
            autoFocus
            className="w-full pl-9 pr-3 py-2 bg-secondary rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 border border-border"
          />
        </div>
      )}
      {/* Banner Ad */}
      <HorizontalBannerAd category="events" variant="slim" className="mb-4" />

            {/* Events content */}
            {isLoading ? (
              <div className="text-center py-12">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground">Carregando eventos...</p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-lg font-semibold text-foreground">Nenhum evento próximo</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || categoryFilter !== "all" ? "Tente ajustar seus filtros" : "Participe de grupos ou siga páginas para ver os eventos deles aqui"}
                </p>
              </div>
            ) : viewMode === "map" ? (
              <EventsMapView events={filteredEvents} />
            ) : (
              <div className="space-y-3">
                {paginatedEvents.map((event: any, index: number) => (
                  <div key={event.id}>
                    <EventCard
                      event={event}
                      isAdminOrMod={false}
                      onDelete={() => {}}
                      onEdit={async () => {}}
                      showSource
                    />
                    {sponsoredPosts.length > 0 && (index + 1) % 5 === 0 && sponsoredPosts[Math.floor(index / 5) % sponsoredPosts.length] && (
                      <div className="mt-3">
                        <SponsoredPostCard post={sponsoredPosts[Math.floor(index / 5) % sponsoredPosts.length]} />
                      </div>
                    )}
                  </div>
                ))}
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} />}
    </AppPageShell>
  );
};

export default Events;
