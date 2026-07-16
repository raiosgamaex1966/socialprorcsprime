import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, CalendarDays, MapPin, Repeat, Download, ExternalLink, Share2, Users, Pencil, Trash2, Copy, UserPlus } from "lucide-react";
import AppPageShell from "@/components/AppPageShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import EventRsvpButtons from "@/components/EventRsvpButtons";
import EventComments from "@/components/EventComments";
import EventShareModal from "@/components/EventShareModal";
import EditEventModal from "@/components/EditEventModal";
import RelatedEvents from "@/components/RelatedEvents";
import AttendeeListModal from "@/components/AttendeeListModal";
import InviteFriendsModal from "@/components/InviteFriendsModal";
import { EVENT_CATEGORIES, EVENT_CATEGORY_COLORS } from "@/constants/eventCategories";
import { downloadICS, getGoogleCalendarUrl } from "@/lib/calendarExport";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const recurrenceLabel: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showShare, setShowShare] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  // Check if current user is admin of the event's group or page
  const { data: isAdmin } = useQuery({
    queryKey: ["event-admin-check", eventId, user?.id],
    queryFn: async () => {
      if (!user || !eventId) return false;
      const { data: ev } = await supabase
        .from("group_events")
        .select("group_id, page_id, created_by")
        .eq("id", eventId)
        .maybeSingle();
      if (!ev) return false;
      if (ev.created_by === user.id) return true;
      if (ev.group_id) {
        const { data } = await supabase.rpc("is_group_admin_or_mod", { _group_id: ev.group_id, _user_id: user.id });
        return !!data;
      }
      if (ev.page_id) {
        const { data } = await supabase.rpc("is_page_admin", { _page_id: ev.page_id, _user_id: user.id });
        return !!data;
      }
      return false;
    },
    enabled: !!eventId && !!user,
  });

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["event-detail", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_events")
        .select("*")
        .eq("id", eventId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .eq("user_id", data.created_by)
        .maybeSingle();

      // Fetch source info
      let source_name: string | null = null;
      let source_type: string | null = null;
      let source_slug: string | null = null;

      if (data.group_id) {
        const { data: group } = await supabase
          .from("groups")
          .select("id, name, avatar_url")
          .eq("id", data.group_id)
          .maybeSingle();
        if (group) {
          source_name = group.name;
          source_type = "group";
        }
      } else if (data.page_id) {
        const { data: page } = await supabase
          .from("pages")
          .select("id, name, slug, avatar_url")
          .eq("id", data.page_id)
          .maybeSingle();
        if (page) {
          source_name = page.name;
          source_type = "page";
          source_slug = page.slug;
        }
      }

      // Fetch attendees for display
      const { data: rsvps } = await supabase
        .from("group_event_rsvps")
        .select("user_id, status")
        .eq("event_id", data.id);

      let attendees = { going: [] as any[], interested: [] as any[], total: 0 };
      if (rsvps && rsvps.length > 0) {
        const userIds = [...new Set(rsvps.map((r) => r.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
        const going = rsvps.filter((r) => r.status === "going").map((r) => ({ ...r, ...profileMap.get(r.user_id) }));
        const interested = rsvps.filter((r) => r.status === "interested").map((r) => ({ ...r, ...profileMap.get(r.user_id) }));
        attendees = { going, interested, total: going.length + interested.length };
      }

      return { ...data, profile, source_name, source_type, source_slug, attendees };
    },
    enabled: !!eventId,
  });

  if (isLoading) {
    return (
      <AppPageShell>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-secondary/50 rounded-xl" />
          <div className="h-6 w-2/3 bg-secondary/50 rounded" />
          <div className="h-4 w-1/2 bg-secondary/50 rounded" />
        </div>
      </AppPageShell>
    );
  }

  if (!event || error) {
    return (
      <AppPageShell>
        <div className="py-16 text-center">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <h1 className="text-xl font-bold text-foreground">Evento não encontrado</h1>
          <p className="text-sm text-muted-foreground mt-1">Este evento pode ter sido excluído ou você não tem acesso.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/events")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Eventos
          </Button>
        </div>
      </AppPageShell>
    );
  }

  const eventDate = new Date(event.event_date);
  const categoryInfo = EVENT_CATEGORIES.find((c) => c.value === event.category) || EVENT_CATEGORIES[0];
  const catColor = EVENT_CATEGORY_COLORS[event.category] || EVENT_CATEGORY_COLORS.general;
  const isRecurring = event.recurrence_type && event.recurrence_type !== "none";
  const isPast = eventDate < new Date();

  const calendarEvent = {
    title: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    startDate: eventDate,
  };

  const sourceLink = event.source_type === "group" && event.group_id
    ? `/groups/${event.group_id}`
    : event.source_slug ? `/pages/${event.source_slug}` : null;

  return (
    <AppPageShell>
        {/* Breadcrumb navigation */}
        <nav className="flex items-center gap-1.5 text-sm mb-4 flex-wrap">
          <Link to="/events" className="text-muted-foreground hover:text-foreground transition-colors">
            Eventos
          </Link>
          {event && event.source_name && sourceLink && (
            <>
              <span className="text-muted-foreground/50">/</span>
              <Link to={sourceLink} className="text-muted-foreground hover:text-foreground transition-colors">
                {event.source_name}
              </Link>
            </>
          )}
          {event && (
            <>
              <span className="text-muted-foreground/50">/</span>
              <span className="text-foreground font-medium truncate max-w-[200px]">{event.title}</span>
            </>
          )}
        </nav>

        {/* Cover image */}
        {event.cover_image_url && (
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="w-full h-48 sm:h-64 object-cover rounded-xl mb-4"
          />
        )}

        {/* Main card */}
        <div className="rounded-lg bg-card shadow-sm p-5 sm:p-6">
          {/* Category & recurrence badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ backgroundColor: `${catColor}20`, color: catColor }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: catColor }} />
              {categoryInfo.icon} {categoryInfo.label}
            </span>
            {isRecurring && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                <Repeat className="w-3 h-3" />
                {recurrenceLabel[event.recurrence_type] || event.recurrence_type}
              </span>
            )}
            {isPast && (
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">Evento encerrado</span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{event.title}</h1>

          {/* Date & location */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <CalendarDays className="w-4 h-4" />
              {format(eventDate, "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {event.location}
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-foreground mt-4 whitespace-pre-wrap leading-relaxed">
              {event.description}
            </p>
          )}

          {/* Source & creator */}
          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            {event.profile && (
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={event.profile.avatar_url || ""} />
                  <AvatarFallback className="text-[10px]">
                    {(event.profile.display_name || "?")[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">Criado por <span className="font-medium text-foreground">{event.profile.display_name || "Desconhecido"}</span></span>
              </div>
            )}
          </div>
          {event.source_name && sourceLink && (
            <Link
              to={sourceLink}
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-primary hover:underline"
            >
              {event.source_type === "group" ? "👥" : "📄"} {event.source_name}
            </Link>
          )}

          {/* Attendee summary */}
          {event.attendees && event.attendees.total > 0 && (
            <button
              onClick={() => setShowAttendees(true)}
              className="mt-4 w-full text-left p-3 rounded-lg bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {event.attendees.going.length > 0 && (
                    <span className="font-medium text-foreground">{event.attendees.going.length} vão</span>
                  )}
                  {event.attendees.going.length > 0 && event.attendees.interested.length > 0 && " · "}
                  {event.attendees.interested.length > 0 && (
                    <span>{event.attendees.interested.length} interessados</span>
                  )}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground/70">Ver todos →</span>
              </div>
              {/* Stacked avatars */}
              <div className="flex -space-x-2 mt-2">
                {[...event.attendees.going, ...event.attendees.interested].slice(0, 8).map((person: any, i: number) => (
                  <Avatar key={person.user_id || i} className="w-7 h-7 border-2 border-card">
                    <AvatarImage src={person.avatar_url || ""} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {(person.display_name || "?")[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {event.attendees.total > 8 && (
                  <div className="w-7 h-7 rounded-full border-2 border-card bg-muted flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-muted-foreground">+{event.attendees.total - 8}</span>
                  </div>
                )}
              </div>
            </button>
          )}

          {/* RSVP controls */}
          {!isPast && (
            <div className="mt-4">
              <EventRsvpButtons eventId={event.id} eventDate={event.event_date} />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => downloadICS(calendarEvent)} className="text-xs">
                  <Download className="w-3 h-3 mr-2" /> Baixar arquivo .ics
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(getGoogleCalendarUrl(calendarEvent), "_blank")} className="text-xs">
                  <ExternalLink className="w-3 h-3 mr-2" /> Google Agenda
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowShare(true)}>
              <Share2 className="w-3.5 h-3.5 mr-1.5" /> Compartilhar
            </Button>
            {!isPast && user && (
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowInvite(true)}>
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Convidar
              </Button>
            )}
          </div>
        </div>

        {/* Comments section */}
        <div className="rounded-lg bg-card shadow-sm p-5 sm:p-6 mt-4">
          <h2 className="text-sm font-semibold text-foreground mb-1">Discussão</h2>
          <EventComments eventId={event.id} />
        </div>

        {/* Related events */}
        <RelatedEvents
          currentEventId={event.id}
          groupId={event.group_id}
          pageId={event.page_id}
          sourceName={event.source_name}
        />

        {showShare && <EventShareModal event={event} onClose={() => setShowShare(false)} />}
        {showEdit && <EditEventModal event={event} onClose={() => setShowEdit(false)} />}
        {showAttendees && event.attendees && (
          <AttendeeListModal
            going={event.attendees.going}
            interested={event.attendees.interested}
            onClose={() => setShowAttendees(false)}
          />
        )}
        {showInvite && (
          <InviteFriendsModal
            eventId={event.id}
            eventTitle={event.title}
            onClose={() => setShowInvite(false)}
          />
        )}
    </AppPageShell>
  );
};

export default EventDetail;
