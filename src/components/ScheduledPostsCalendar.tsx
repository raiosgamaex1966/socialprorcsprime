import { useState, useMemo, useCallback, DragEvent } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, addWeeks, subWeeks, isSameMonth, isToday, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, FileText, Pencil, Trash2, X, Check, CalendarIcon, Loader2, Rocket, GripVertical, LayoutGrid, List, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import ScheduledPostsWeeklyView from "./ScheduledPostsWeeklyView";

interface ScheduledPost {
  id: string;
  content: string;
  scheduled_at: string;
  image_url?: string | null;
}

interface ScheduledPostsCalendarProps {
  scheduledPosts: ScheduledPost[];
  pageId: string;
  onPublishNow: (postId: string) => void;
  onClickSlot?: (date: Date, hour: number) => void;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const ScheduledPostsCalendar = ({ scheduledPosts, pageId: _pageId, onPublishNow, onClickSlot }: ScheduledPostsCalendarProps) => {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [editTime, setEditTime] = useState("12:00");
  const [savingEdit, setSavingEdit] = useState(false);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [bulkActioning, setBulkActioning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggleSelectPost = useCallback((postId: string) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedPostIds(new Set(scheduledPosts.map((p) => p.id)));
  }, [scheduledPosts]);

  const deselectAll = useCallback(() => {
    setSelectedPostIds(new Set());
  }, []);

  const handleBulkPublish = async () => {
    if (selectedPostIds.size === 0) return;
    setBulkActioning(true);
    try {
      const ids = Array.from(selectedPostIds);
      await supabase
        .from("page_posts")
        .update({ scheduled_at: null })
        .in("id", ids);
      queryClient.invalidateQueries({ queryKey: ["page-posts"] });
      toast.success(ids.length === 1 ? "Publicação publicada!" : `${ids.length} publicações publicadas!`);
      setSelectedPostIds(new Set());
      setBulkMode(false);
    } catch {
      toast.error("Falha ao publicar publicações");
    }
    setBulkActioning(false);
  };

  const handleBulkDelete = async () => {
    if (selectedPostIds.size === 0) return;
    setBulkActioning(true);
    try {
      const ids = Array.from(selectedPostIds);
      await supabase
        .from("page_posts")
        .delete()
        .in("id", ids);
      queryClient.invalidateQueries({ queryKey: ["page-posts"] });
      toast.success(ids.length === 1 ? "Publicação excluída!" : `${ids.length} publicações excluídas!`);
      setSelectedPostIds(new Set());
      setBulkMode(false);
    } catch {
      toast.error("Falha ao excluir publicações");
    }
    setBulkActioning(false);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const postsByDate = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    scheduledPosts.forEach((post) => {
      const key = format(new Date(post.scheduled_at), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    });
    return map;
  }, [scheduledPosts]);

  const selectedDayPosts = selectedDay
    ? scheduledPosts
        .filter((p) => isSameDay(new Date(p.scheduled_at), selectedDay))
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    : [];

  // --- Drag and drop handlers ---
  const handleDragStart = useCallback((e: DragEvent, post: ScheduledPost) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ postId: post.id, scheduledAt: post.scheduled_at }));
    e.dataTransfer.effectAllowed = "move";
    setDraggingPostId(post.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingPostId(null);
    setDragOverDate(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDate(dateKey);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null);
  }, []);

  const handleDrop = useCallback(async (e: DragEvent, targetDay: Date) => {
    e.preventDefault();
    setDragOverDate(null);
    setDraggingPostId(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const { postId, scheduledAt } = data as { postId: string; scheduledAt: string };

      const originalDate = new Date(scheduledAt);
      if (isSameDay(originalDate, targetDay)) return;

      // Keep original time, change date
      const newDate = new Date(targetDay);
      newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);

      if (newDate <= new Date()) {
        toast.error("Não é possível reagendar para uma data/hora passada");
        return;
      }

      await supabase
        .from("page_posts")
        .update({ scheduled_at: newDate.toISOString() })
        .eq("id", postId);

      queryClient.invalidateQueries({ queryKey: ["page-posts"] });
      toast.success(`Publicação movida para ${format(newDate, "dd/MM/yyyy")}`);
    } catch {
      toast.error("Falha ao reagendar publicação");
    }
  }, [queryClient]);

  const handleDelete = async (postId: string) => {
    try {
      await supabase.from("page_posts").delete().eq("id", postId);
      queryClient.invalidateQueries({ queryKey: ["page-posts"] });
      toast.success("Publicação agendada excluída");
    } catch {
      toast.error("Falha ao excluir");
    }
  };

  const startEditing = (post: ScheduledPost) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
    const d = new Date(post.scheduled_at);
    setEditDate(d);
    setEditTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim() || !editDate) return;
    setSavingEdit(true);
    try {
      const [hours, minutes] = editTime.split(":").map(Number);
      const dt = new Date(editDate);
      dt.setHours(hours, minutes, 0, 0);
      if (dt <= new Date()) {
        toast.error("O horário agendado deve ser no futuro");
        setSavingEdit(false);
        return;
      }
      await supabase
        .from("page_posts")
        .update({ content: editContent.trim(), scheduled_at: dt.toISOString() })
        .eq("id", postId);
      queryClient.invalidateQueries({ queryKey: ["page-posts"] });
      setEditingPostId(null);
      toast.success("Publicação atualizada");
    } catch {
      toast.error("Falha ao atualizar");
    }
    setSavingEdit(false);
  };

  const upcomingCount = scheduledPosts.filter(
    (p) => new Date(p.scheduled_at) > new Date()
  ).length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-primary/10 text-primary rounded-lg px-3 py-1.5 text-sm font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {upcomingCount} próximas
          </div>
          <div className="bg-secondary rounded-lg px-3 py-1.5 text-sm text-muted-foreground flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            {scheduledPosts.length} agendadas no total
          </div>
          <div className="bg-secondary rounded-lg px-3 py-1.5 text-sm text-muted-foreground flex items-center gap-1.5">
            <GripVertical className="w-4 h-4" />
            Arraste as publicações para reagendar
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk select toggle */}
          {scheduledPosts.length > 0 && (
            <button
              onClick={() => {
                setBulkMode(!bulkMode);
                if (bulkMode) setSelectedPostIds(new Set());
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border",
                bulkMode
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-secondary"
              )}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Select
            </button>
          )}
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("month")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors",
                viewMode === "month" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Mês
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors",
                viewMode === "week" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              <List className="w-3.5 h-3.5" />
              Semana
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action toolbar */}
      {bulkMode && (
        <div className="bg-card rounded-xl border border-border p-3 flex items-center gap-3 flex-wrap animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <button
              onClick={selectedPostIds.size === scheduledPosts.length ? deselectAll : selectAll}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {selectedPostIds.size === scheduledPosts.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
            <span className="text-xs text-muted-foreground">
              {selectedPostIds.size} de {scheduledPosts.length} selecionados
            </span>
          </div>
          <div className="flex-1" />
          <button
            onClick={handleBulkPublish}
            disabled={selectedPostIds.size === 0 || bulkActioning}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {bulkActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
            Publicar {selectedPostIds.size > 0 ? `(${selectedPostIds.size})` : ""}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={selectedPostIds.size === 0 || bulkActioning}
            className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {bulkActioning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Excluir {selectedPostIds.size > 0 ? `(${selectedPostIds.size})` : ""}
          </button>
          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir {selectedPostIds.size} publicação(ões)?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. As publicações agendadas selecionadas serão excluídas permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleBulkDelete}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {viewMode === "month" ? (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-sm font-bold text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-1 py-2 text-center text-xs font-semibold text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[72px] border-b border-r border-border bg-muted/20" />
          ))}

          {daysInMonth.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayPosts = postsByDate.get(key) || [];
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const today = isToday(day);
            const isDragOver = dragOverDate === key;
            const isPastDay = day < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <div
                key={key}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                onDragOver={(e) => {
                  if (!isPastDay) handleDragOver(e, key);
                }}
                onDragLeave={handleDragLeave}
                onDrop={(e) => {
                  if (!isPastDay) handleDrop(e, day);
                }}
                className={cn(
                  "min-h-[72px] border-b border-r border-border p-1.5 text-left transition-all relative cursor-pointer select-none",
                  isSelected && "bg-primary/5 ring-1 ring-inset ring-primary",
                  !isSelected && !isDragOver && "hover:bg-secondary/50",
                  today && !isSelected && !isDragOver && "bg-accent/30",
                  isDragOver && "bg-primary/15 ring-2 ring-inset ring-primary scale-[1.02] z-10 shadow-lg",
                  draggingPostId && !isPastDay && !isDragOver && "ring-1 ring-inset ring-border/50"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full",
                    today && "bg-primary text-primary-foreground",
                    !today && !isSameMonth(day, currentMonth) && "text-muted-foreground/50",
                    !today && isSameMonth(day, currentMonth) && "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>

                {dayPosts.length > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {dayPosts.slice(0, 2).map((post) => (
                      <div
                        key={post.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          handleDragStart(e, post);
                        }}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "text-[10px] leading-tight px-1 py-0.5 rounded bg-primary/15 text-primary font-medium truncate cursor-grab active:cursor-grabbing hover:bg-primary/25 transition-colors",
                          draggingPostId === post.id && "opacity-40"
                        )}
                        title={`Drag to reschedule: ${post.content.slice(0, 50)}`}
                      >
                        {format(new Date(post.scheduled_at), "h:mm a")}
                      </div>
                    ))}
                    {dayPosts.length > 2 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayPosts.length - 2} mais
                      </div>
                    )}
                  </div>
                )}

                {isDragOver && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                      Solte aqui
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      ) : (
        <>
          {/* Week navigation */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <button
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-bold text-foreground">
                Week of {format(currentWeek, "MMM d, yyyy")}
              </h3>
              <button
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <ScheduledPostsWeeklyView
            scheduledPosts={scheduledPosts}
            currentDate={currentWeek}
            onPublishNow={onPublishNow}
            onEdit={startEditing}
            onDelete={handleDelete}
            onClickSlot={onClickSlot}
          />
        </>
      )}

      {/* Selected day detail */}
      {selectedDay && (
        <div className="bg-card rounded-xl border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground">
                {format(selectedDay, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h4>
              <span className="text-xs text-muted-foreground">
                ({selectedDayPosts.length} {selectedDayPosts.length === 1 ? "publicação" : "publicações"})
              </span>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedDayPosts.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">Nenhuma publicação agendada para este dia</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {selectedDayPosts.map((post) => (
                <div key={post.id} className="p-4">
                  {editingPostId === post.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-3 rounded-lg bg-secondary border border-border text-sm text-foreground resize-none outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm text-foreground hover:bg-accent transition-colors"
                            >
                              <CalendarIcon className="w-3.5 h-3.5" />
                              {editDate ? format(editDate, "dd/MM/yyyy") : "Escolher data"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={editDate}
                              onSelect={setEditDate}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className="px-2 py-1.5 rounded-lg bg-secondary border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setEditingPostId(null)}
                          className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveEdit(post.id)}
                          disabled={!editContent.trim() || !editDate || savingEdit}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-16 text-center">
                        <div className="text-xs font-bold text-primary bg-primary/10 rounded-lg px-2 py-1">
                          {format(new Date(post.scheduled_at), "h:mm a")}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{post.content}</p>
                        {post.image_url && (
                          <div className="mt-2 w-16 h-16 rounded-lg overflow-hidden bg-secondary">
                            <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => onPublishNow(post.id)}
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title="Publish now"
                        >
                          <Rocket className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => startEditing(post)}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline list of all upcoming */}
      {scheduledPosts.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h4 className="text-sm font-bold text-foreground">Todas as Publicações Agendadas</h4>
          </div>
          <div className="divide-y divide-border">
            {[...scheduledPosts]
              .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
              .map((post, i, arr) => {
                const postDate = new Date(post.scheduled_at);
                const prevDate = i > 0 ? new Date(arr[i - 1].scheduled_at) : null;
                const showDateHeader = !prevDate || !isSameDay(postDate, prevDate);
                const isExpired = isPast(postDate);

                return (
                  <div key={post.id}>
                    {showDateHeader && (
                      <div className="px-4 py-2 bg-secondary/50">
                        <span className={cn("text-xs font-bold", isExpired ? "text-muted-foreground" : "text-foreground")}>
                          {format(postDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        "px-4 py-3 flex items-center gap-3 transition-colors",
                        isExpired && "opacity-50",
                        bulkMode && "cursor-pointer hover:bg-secondary/50",
                        bulkMode && selectedPostIds.has(post.id) && "bg-primary/5"
                      )}
                      onClick={bulkMode ? () => toggleSelectPost(post.id) : undefined}
                    >
                      {bulkMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelectPost(post.id); }}
                          className="flex-shrink-0 text-primary"
                        >
                          {selectedPostIds.has(post.id) ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                      {!bulkMode && <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" />}
                      <span className="text-xs font-semibold text-primary w-16 flex-shrink-0">
                        {format(postDate, "h:mm a")}
                      </span>
                      <p className="text-sm text-foreground flex-1 min-w-0 truncate">{post.content}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledPostsCalendar;
