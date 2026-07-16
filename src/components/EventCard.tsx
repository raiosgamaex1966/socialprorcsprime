import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarDays, MapPin, Pencil, Trash2, X, Repeat, Clock, ChevronDown, MessageCircle, Download, ExternalLink, Share2 } from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect } from "react";
import EventRsvpButtons from "./EventRsvpButtons";
import EventForm, { type EventFormValues } from "./EventForm";
import EventComments from "./EventComments";
import EventShareModal from "./EventShareModal";
import { EVENT_CATEGORIES, EVENT_CATEGORY_COLORS } from "@/constants/eventCategories";
import { downloadICS, getGoogleCalendarUrl } from "@/lib/calendarExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

interface EventCardProps {
  event: any;
  isAdminOrMod: boolean;
  isPast?: boolean;
  onDelete: (eventId: string) => void;
  onDeleteSeries?: (parentEventId: string) => void;
  onEdit: (eventId: string, values: EventFormValues) => Promise<void>;
  showSource?: boolean;
}

const EventAttendeeBar = ({ attendees }: { attendees?: { going: any[]; interested: any[]; total: number } }) => {
  if (!attendees || attendees.total === 0) return null;

  const allPeople = [...attendees.going, ...attendees.interested];
  const displayAvatars = allPeople.slice(0, 5);
  const remaining = attendees.total - displayAvatars.length;
  const goingCount = attendees.going.length;
  const interestedCount = attendees.interested.length;

  return (
    <div className="mt-2 pt-2 border-t border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Stacked avatars */}
          <div className="flex -space-x-2">
            <TooltipProvider delayDuration={200}>
              {displayAvatars.map((person: any, i: number) => (
                <Tooltip key={person.user_id || i}>
                  <TooltipTrigger asChild>
                    <Avatar className="w-6 h-6 border-2 border-background ring-0">
                      <AvatarImage src={person.avatar_url || ""} />
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                        {(person.display_name || "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p>{person.display_name || "Desconhecido"}</p>
                    <p className="text-muted-foreground capitalize">
                      {person.status === "going" ? "Confirmado" : person.status === "interested" ? "Interessado" : person.status}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
            {remaining > 0 && (
              <div className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                <span className="text-[9px] font-semibold text-muted-foreground">+{remaining}</span>
              </div>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {goingCount > 0 && <span className="font-medium text-foreground">{goingCount} confirmado{goingCount !== 1 ? "s" : ""}</span>}
            {goingCount > 0 && interestedCount > 0 && " · "}
            {interestedCount > 0 && <span>{interestedCount} interessado{interestedCount !== 1 ? "s" : ""}</span>}
          </span>
        </div>
      </div>
      {/* Visual bar */}
      {attendees.total > 0 && (
        <div className="flex h-1 rounded-full overflow-hidden mt-1.5 bg-muted">
          {goingCount > 0 && (
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(goingCount / attendees.total) * 100}%` }}
            />
          )}
          {interestedCount > 0 && (
            <div
              className="h-full bg-primary/30 rounded-full transition-all"
              style={{ width: `${(interestedCount / attendees.total) * 100}%` }}
            />
          )}
        </div>
      )}
    </div>
  );
};

const recurrenceLabel: Record<string, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
};

const CountdownTimer = ({ eventDate }: { eventDate: Date }) => {
  const [secsLeft, setSecsLeft] = useState(() => differenceInSeconds(eventDate, new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = differenceInSeconds(eventDate, new Date());
      setSecsLeft(diff);
      if (diff <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [eventDate]);

  if (secsLeft <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full animate-pulse">
        <Clock className="w-3 h-3" /> Começando agora!
      </span>
    );
  }

  const hours = Math.floor(secsLeft / 3600);
  const minutes = Math.floor((secsLeft % 3600) / 60);
  const seconds = secsLeft % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" />
      {hours > 0 && `${hours}h `}{pad(minutes)}m {pad(seconds)}s
    </span>
  );
};

const EventCard = ({ event, isAdminOrMod, isPast, onDelete, onDeleteSeries, onEdit, showSource }: EventCardProps) => {
  const [editing, setEditing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const categoryInfo = EVENT_CATEGORIES.find((c) => c.value === event.category) || EVENT_CATEGORIES[0];

  const { data: commentCount = 0 } = useQuery({
    queryKey: ["event-comment-count", event.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_comments" as any)
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const eventDateObj = new Date(event.event_date);
  const now = new Date();
  const msUntil = eventDateObj.getTime() - now.getTime();
  const isWithin24h = !isPast && msUntil > 0 && msUntil <= 24 * 60 * 60 * 1000;
  const isRecurring = event.recurrence_type && event.recurrence_type !== "none";
  const parentId = event.parent_event_id || (isRecurring ? event.id : null);

  const calendarEvent = {
    title: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    startDate: eventDateObj,
  };

  const initialValues = {
    title: event.title,
    description: event.description || "",
    eventDate: format(eventDateObj, "yyyy-MM-dd"),
    eventTime: format(eventDateObj, "HH:mm"),
    location: event.location || "",
    recurrenceType: event.recurrence_type || "none",
    recurrenceEndDate: event.recurrence_end_date ? format(new Date(event.recurrence_end_date), "yyyy-MM-dd") : "",
    category: event.category || "general",
  };

  const handleEdit = async (values: EventFormValues) => {
    await onEdit(event.id, values);
    setEditing(false);
  };

  const recurBadge = isRecurring ? (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
      <Repeat className="w-2.5 h-2.5" />
      {recurrenceLabel[event.recurrence_type] || event.recurrence_type}
    </span>
  ) : null;

  const catColor = EVENT_CATEGORY_COLORS[event.category] || EVENT_CATEGORY_COLORS.general;

  const categoryBadge = (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: `${catColor}20`, color: catColor }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: catColor }}
      />
      {categoryInfo.icon} {categoryInfo.label}
    </span>
  );

  const CalendarExportMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1 rounded hover:bg-background text-muted-foreground hover:text-primary transition-colors" title="Exportar para calendário">
          <Download className="w-3.5 h-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => downloadICS(calendarEvent)} className="text-xs">
          <Download className="w-3 h-3 mr-2" /> Baixar arquivo .ics
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(getGoogleCalendarUrl(calendarEvent), "_blank")} className="text-xs">
          <ExternalLink className="w-3 h-3 mr-2" /> Adicionar ao Google Agenda
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const DeleteButton = () => {
    if (!isRecurring || !parentId || !onDeleteSeries) {
      return (
        <button onClick={() => onDelete(event.id)} className="p-1 rounded hover:bg-background text-muted-foreground hover:text-destructive transition-colors" title="Excluir evento">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      );
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 rounded hover:bg-background text-muted-foreground hover:text-destructive transition-colors" title="Excluir evento">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onDelete(event.id)} className="text-xs">Excluir esta ocorrência</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDeleteSeries(parentId)} className="text-xs text-destructive focus:text-destructive">Excluir todas as ocorrências</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (isPast) {
    return (
      <div className="rounded-lg overflow-hidden bg-card shadow-sm opacity-60">
        {event.cover_image_url && (
          <img src={event.cover_image_url} alt="" className="w-full h-24 object-cover" />
        )}
        <div className="p-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-medium text-foreground">{event.title}</h3>
            {categoryBadge}
            {recurBadge}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
            <CalendarDays className="w-3 h-3" />
            {format(eventDateObj, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
          {event.location && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {event.location}
            </div>
          )}
          {showSource && event.source_name && (
            <p className="text-[10px] text-muted-foreground mt-1">
              {event.source_type === "group" ? "👥" : "📄"} {event.source_name}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden bg-card shadow-sm transition-all">
      {/* Cover image */}
      {event.cover_image_url && (
        <img src={event.cover_image_url} alt="" className="w-full h-32 object-cover" />
      )}

      {editing ? (
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-foreground">Editar Evento</p>
            <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-background text-muted-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <EventForm
            initialValues={initialValues}
            onSubmit={handleEdit}
            submitLabel="Salvar Alterações"
            savingLabel="Salvando..."
            showRecurrence={!event.parent_event_id}
          />
        </div>
      ) : (
        <div className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link to={`/events/${event.id}`} className="text-sm font-semibold text-foreground hover:underline">{event.title}</Link>
                {categoryBadge}
                {recurBadge}
              </div>
              {isWithin24h && <CountdownTimer eventDate={eventDateObj} />}
              <div className="flex items-center gap-1 mt-1 text-xs text-primary font-medium">
                <CalendarDays className="w-3 h-3" />
                {format(eventDateObj, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
              {event.location && (
                <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {event.location}
                </div>
              )}
              {event.description && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{event.description}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                por {event.profile?.display_name || "Desconhecido"}
              </p>
              {showSource && event.source_name && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {event.source_type === "group" ? "👥" : "📄"} {event.source_name}
                </p>
              )}
              <EventRsvpButtons eventId={event.id} eventDate={event.event_date} />
              <EventAttendeeBar attendees={event.attendees} />
            </div>
            <div className="flex items-center gap-0.5">
              <CalendarExportMenu />
            </div>
          </div>

          {/* Comments & Share */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-3 h-3" />
              {commentCount > 0 ? `${commentCount} comentário${commentCount !== 1 ? "s" : ""}` : "Comentar"}
            </button>
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Share2 className="w-3 h-3" />
              Compartilhar
            </button>
          </div>

          {showComments && <EventComments eventId={event.id} />}
          {showShare && <EventShareModal event={event} onClose={() => setShowShare(false)} />}
        </div>
      )}
    </div>
  );
};

export default EventCard;
