import { useMemo, useCallback, DragEvent } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, eachHourOfInterval, isSameDay, isToday, isPast, set as setDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Clock, Rocket, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ScheduledPost {
  id: string;
  content: string;
  scheduled_at: string;
  image_url?: string | null;
}

interface ScheduledPostsWeeklyViewProps {
  scheduledPosts: ScheduledPost[];
  currentDate: Date;
  onPublishNow: (postId: string) => void;
  onEdit: (post: ScheduledPost) => void;
  onDelete: (postId: string) => void;
  onClickSlot?: (date: Date, hour: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const ScheduledPostsWeeklyView = ({
  scheduledPosts,
  currentDate,
  onPublishNow,
  onEdit,
  onDelete,
  onClickSlot,
}: ScheduledPostsWeeklyViewProps) => {
  const queryClient = useQueryClient();

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const postsByDayHour = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    scheduledPosts.forEach((post) => {
      const d = new Date(post.scheduled_at);
      const key = `${format(d, "yyyy-MM-dd")}-${d.getHours()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    });
    return map;
  }, [scheduledPosts]);

  const handleDrop = useCallback(async (e: DragEvent, targetDay: Date, hour: number) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const { postId, scheduledAt } = data as { postId: string; scheduledAt: string };
      const originalDate = new Date(scheduledAt);

      const newDate = new Date(targetDay);
      newDate.setHours(hour, originalDate.getMinutes(), 0, 0);

      if (isSameDay(originalDate, newDate) && originalDate.getHours() === hour) return;

      if (newDate <= new Date()) {
        toast.error("Não é possível reprogramar para uma data/hora passada");
        return;
      }

      await supabase
        .from("page_posts")
        .update({ scheduled_at: newDate.toISOString() })
        .eq("id", postId);

      queryClient.invalidateQueries({ queryKey: ["page-posts"] });
      toast.success(`Publicação movida para ${format(newDate, "d 'de' MMM, H:mm", { locale: ptBR })}`);
    } catch {
      toast.error("Falha ao reprogramar publicação");
    }
  }, [queryClient]);

  // Only show hours 6-23 by default for a cleaner view
  const visibleHours = HOURS.filter(h => h >= 6);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header row with day names */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
        <div className="p-2 border-r border-border" />
        {weekDays.map((day) => (
          <div
            key={format(day, "yyyy-MM-dd")}
            className={cn(
              "p-2 text-center border-r border-border last:border-r-0",
              isToday(day) && "bg-primary/10"
            )}
          >
            <div className="text-[10px] font-semibold text-muted-foreground uppercase">
              {format(day, "EEE", { locale: ptBR })}
            </div>
            <div
              className={cn(
                "text-sm font-bold mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full",
                isToday(day) && "bg-primary text-primary-foreground"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="max-h-[500px] overflow-y-auto">
        {visibleHours.map((hour) => (
          <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border last:border-b-0">
            {/* Hour label */}
            <div className="p-1 pr-2 text-right border-r border-border flex-shrink-0">
              <span className="text-[10px] font-medium text-muted-foreground">
                {format(setDate(new Date(), { hours: hour, minutes: 0 }), "H:00")}
              </span>
            </div>

            {/* Day cells for this hour */}
            {weekDays.map((day) => {
              const cellKey = `${format(day, "yyyy-MM-dd")}-${hour}`;
              const cellPosts = postsByDayHour.get(cellKey) || [];
              const isPastCell = isPast(setDate(day, { hours: hour, minutes: 59 }));

              return (
                <div
                  key={cellKey}
                  onDragOver={(e) => { if (!isPastCell) e.preventDefault(); }}
                  onDrop={(e) => { if (!isPastCell) handleDrop(e, day, hour); }}
                  onClick={() => {
                    if (!isPastCell && cellPosts.length === 0 && onClickSlot) {
                      onClickSlot(day, hour);
                    }
                  }}
                  className={cn(
                    "min-h-[48px] border-r border-border last:border-r-0 p-0.5 transition-colors",
                    isToday(day) && "bg-primary/5",
                    isPastCell && "bg-muted/30",
                    !isPastCell && cellPosts.length === 0 && onClickSlot && "cursor-pointer hover:bg-primary/10"
                  )}
                >
                  {cellPosts.map((post) => (
                    <div
                      key={post.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", JSON.stringify({ postId: post.id, scheduledAt: post.scheduled_at }));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="group bg-primary/15 text-primary rounded px-1.5 py-1 mb-0.5 cursor-grab active:cursor-grabbing hover:bg-primary/25 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="text-[10px] font-semibold truncate">
                          {format(new Date(post.scheduled_at), "H:mm")}
                        </span>
                      </div>
                      <p className="text-[10px] leading-tight truncate text-primary/80 mt-0.5">
                        {post.content.slice(0, 40)}
                      </p>
                      {/* Action buttons on hover */}
                      <div className="hidden group-hover:flex items-center gap-0.5 mt-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); onPublishNow(post.id); }}
                          className="p-0.5 rounded hover:bg-primary/20 text-primary"
                          title="Publicar agora"
                        >
                          <Rocket className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(post); }}
                          className="p-0.5 rounded hover:bg-primary/20 text-primary"
                          title="Editar"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
                          className="p-0.5 rounded hover:bg-destructive/20 text-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduledPostsWeeklyView;
