import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, MapPin, Clock, Repeat } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EventCalendarViewProps {
  events: any[];
}

const recurrenceLabel: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EventCalendarView = ({ events }: EventCalendarViewProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const event of events) {
      const key = format(new Date(event.event_date), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  return (
    <div className="mt-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-border/50 rounded-lg overflow-hidden">
        {calendarDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(key) || [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <div
              key={key}
              className={`min-h-[72px] p-1 bg-card transition-colors ${
                !inMonth ? "opacity-30" : ""
              } ${today ? "ring-1 ring-inset ring-primary/40" : ""}`}
            >
              <div className={`text-[11px] font-medium mb-0.5 ${
                today
                  ? "text-primary font-bold"
                  : inMonth
                    ? "text-foreground"
                    : "text-muted-foreground"
              }`}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map((event: any) => (
                  <EventDot key={event.id} event={event} />
                ))}
                {dayEvents.length > 2 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-[9px] font-medium text-primary hover:underline w-full text-left px-1">
                        +{dayEvents.length - 2} more
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2 space-y-1.5" align="start">
                      <p className="text-xs font-semibold text-foreground mb-1">
                        {format(day, "EEEE, MMM d")}
                      </p>
                      {dayEvents.map((event: any) => (
                        <EventPopoverItem key={event.id} event={event} />
                      ))}
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EventDot = ({ event }: { event: any }) => {
  const isRecurring = event.recurrence_type && event.recurrence_type !== "none";
  const isPast = new Date(event.event_date) < new Date();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`w-full text-left text-[9px] leading-tight font-medium px-1 py-0.5 rounded truncate transition-colors ${
            isPast
              ? "bg-muted text-muted-foreground"
              : "bg-primary/15 text-primary hover:bg-primary/25"
          }`}
        >
          {isRecurring && <Repeat className="w-2 h-2 inline mr-0.5" />}
          {event.title}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <EventPopoverItem event={event} />
      </PopoverContent>
    </Popover>
  );
};

const EventPopoverItem = ({ event }: { event: any }) => {
  const isRecurring = event.recurrence_type && event.recurrence_type !== "none";
  const eventDate = new Date(event.event_date);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs font-semibold text-foreground">{event.title}</span>
        {isRecurring && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-primary bg-primary/10 px-1 py-0.5 rounded-full">
            <Repeat className="w-2 h-2" />
            {recurrenceLabel[event.recurrence_type] || event.recurrence_type}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Clock className="w-2.5 h-2.5" />
        {format(eventDate, "h:mm a")}
      </div>
      {event.location && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <MapPin className="w-2.5 h-2.5" />
          {event.location}
        </div>
      )}
      {event.description && (
        <p className="text-[10px] text-muted-foreground line-clamp-2">{event.description}</p>
      )}
      <p className="text-[9px] text-muted-foreground">
        by {event.profile?.display_name || "Unknown"}
      </p>
    </div>
  );
};

export default EventCalendarView;
