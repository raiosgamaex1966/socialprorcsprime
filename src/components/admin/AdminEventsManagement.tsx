import { useState, useEffect } from "react";
import TablePagination, { usePagination } from "@/components/admin/TablePagination";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, CalendarDays, Loader2, Trash2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { EVENT_CATEGORIES, EVENT_CATEGORY_COLORS } from "@/constants/eventCategories";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  category: string;
  group_id: string | null;
  page_id: string | null;
  created_by: string;
  source_name?: string;
  source_type?: string;
  creator_name?: string;
  rsvp_count?: number;
}

const AdminEventsManagement = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data: eventsData } = await supabase.from("group_events").select("*").order("event_date", { ascending: false });
    if (eventsData) {
      const creatorIds = [...new Set(eventsData.map((e: any) => e.created_by))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name").in("user_id", creatorIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));
      const groupIds = [...new Set(eventsData.filter((e: any) => e.group_id).map((e: any) => e.group_id))];
      const pageIds = [...new Set(eventsData.filter((e: any) => e.page_id).map((e: any) => e.page_id))];
      const groupMap = new Map<string, string>();
      const pageMap = new Map<string, string>();
      if (groupIds.length) {
        const { data: groups } = await supabase.from("groups").select("id, name").in("id", groupIds);
        (groups || []).forEach((g: any) => groupMap.set(g.id, g.name));
      }
      if (pageIds.length) {
        const { data: pages } = await supabase.from("pages").select("id, name").in("id", pageIds);
        (pages || []).forEach((p: any) => pageMap.set(p.id, p.name));
      }
      const eventIds = eventsData.map((e: any) => e.id);
      const { data: rsvps } = await supabase.from("group_event_rsvps").select("event_id").in("event_id", eventIds);
      const rsvpMap = new Map<string, number>();
      (rsvps || []).forEach((r: any) => rsvpMap.set(r.event_id, (rsvpMap.get(r.event_id) || 0) + 1));
      setEvents(eventsData.map((e: any) => ({
        ...e,
        creator_name: profileMap.get(e.created_by) || "Unknown",
        source_name: e.group_id ? groupMap.get(e.group_id) : e.page_id ? pageMap.get(e.page_id) : undefined,
        source_type: e.group_id ? "group" : e.page_id ? "page" : undefined,
        rsvp_count: rsvpMap.get(e.id) || 0,
      })));
    }
    setLoading(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    setDeleting(true);
    await supabase.from("group_events").delete().eq("id", eventId);
    toast.success("Evento excluído"); setConfirmDelete(null); setDeleting(false); fetchEvents();
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    const ids = [...selected];
    await (supabase as any).from("group_events").delete().in("id", ids);
    toast.success(`${ids.length} evento(s) excluído(s)`);
    setSelected(new Set()); setConfirmBulkDelete(false); setDeleting(false); fetchEvents();
  };

  const now = new Date();
  let filtered = events.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()) || (e.source_name || "").toLowerCase().includes(search.toLowerCase()));
  if (filter === "upcoming") filtered = filtered.filter((e) => new Date(e.event_date) >= now);
  if (filter === "past") filtered = filtered.filter((e) => new Date(e.event_date) < now);

  const pagination = usePagination(filtered, 15);

  const toggleSelect = (id: string) => { setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const toggleAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map((e) => e.id))); };

  const upcomingCount = events.filter((e) => new Date(e.event_date) >= now).length;
  const pastCount = events.filter((e) => new Date(e.event_date) < now).length;

  const getFilterLabel = (f: "all" | "upcoming" | "past") => {
    if (f === "all") return "Todos";
    if (f === "upcoming") return "Próximos";
    return "Passados";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><CalendarDays className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{events.length}</p><p className="text-xs text-muted-foreground">Total de Eventos</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><CalendarDays className="w-5 h-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{upcomingCount}</p><p className="text-xs text-muted-foreground">Próximos</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><CalendarDays className="w-5 h-5 text-muted-foreground" /></div>
            <div><p className="text-2xl font-bold text-foreground">{pastCount}</p><p className="text-xs text-muted-foreground">Passados</p></div>
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Todos os Eventos</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(["all", "upcoming", "past"] as const).map((f) => (
                  <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" className="h-8 text-xs" onClick={() => setFilter(f)}>{getFilterLabel(f)}</Button>
                ))}
              </div>
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Pesquisar eventos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
              </div>
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
                  <TableHead>Evento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Confirmados</TableHead>
                  <TableHead>Criador</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedItems.map((event) => {
                  const catColor = EVENT_CATEGORY_COLORS[event.category] || EVENT_CATEGORY_COLORS.general;
                  const catObj = EVENT_CATEGORIES.find(c => c.value === event.category);
                  const displayCategory = catObj ? catObj.label : event.category;
                  const isPast = new Date(event.event_date) < now;
                  return (
                    <TableRow key={event.id} className={`${isPast ? "opacity-60" : ""} ${selected.has(event.id) ? "bg-primary/5" : ""}`}>
                      <TableCell><Checkbox checked={selected.has(event.id)} onCheckedChange={() => toggleSelect(event.id)} /></TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium text-sm">{event.title}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${catColor}20`, color: catColor }}>{displayCategory}</span>
                            {event.location && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {event.location}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(event.event_date), "MMM d, yyyy h:mm a")}</TableCell>
                      <TableCell>
                        {event.source_name ? (
                          <Badge variant="outline" className="text-xs">{event.source_type === "group" ? "👥" : "📄"} {event.source_name}</Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">{event.rsvp_count}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{event.creator_name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => setConfirmDelete(event.id)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {pagination.paginatedItems.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum evento encontrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination {...pagination} onPageChange={pagination.setCurrentPage} />
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)} title="Excluir Evento" description="Tem certeza que deseja excluir este evento? Todas as confirmações (RSVPs) serão removidas." confirmLabel="Excluir" onConfirm={() => confirmDelete && handleDeleteEvent(confirmDelete)} loading={deleting} />
      <ConfirmDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete} title="Excluir Eventos Selecionados" description={`Tem certeza que deseja excluir ${selected.size} evento(s)? Esta ação não pode ser desfeita.`} confirmLabel={`Excluir ${selected.size} Eventos`} onConfirm={handleBulkDelete} loading={deleting} />
    </div>
  );
};

export default AdminEventsManagement;
