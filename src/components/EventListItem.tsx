import { Link } from "react-router-dom";
import { CalendarDays, MapPin } from "lucide-react";
import { format } from "date-fns";
import { EVENT_CATEGORY_COLORS } from "@/constants/eventCategories";

interface EventListItemProps {
  id: string;
  title: string;
  eventDate: string;
  location?: string | null;
  category?: string;
  /** Optional subtitle line (e.g. source name, RSVP status) */
  subtitle?: React.ReactNode;
  /** Optional trailing badge/element */
  trailing?: React.ReactNode;
  /** Use onClick instead of Link navigation */
  onClick?: () => void;
}

const EventListItem = ({
  id,
  title,
  eventDate,
  location,
  category,
  subtitle,
  trailing,
  onClick,
}: EventListItemProps) => {
  const catColor = category
    ? EVENT_CATEGORY_COLORS[category] || EVENT_CATEGORY_COLORS.general
    : "hsl(var(--primary))";

  const dateObj = new Date(eventDate);

  const content = (
    <>
      {/* Date box */}
      <div
        className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0"
        style={{ backgroundColor: `${catColor}15`, color: catColor }}
      >
        <span className="text-[10px] font-bold leading-none">
          {format(dateObj, "MMM").toUpperCase()}
        </span>
        <span className="text-sm font-bold leading-none">
          {format(dateObj, "d")}
        </span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
          <CalendarDays className="w-3 h-3 shrink-0" />
          {format(dateObj, "EEE, MMM d · h:mm a")}
        </p>
        {location && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{location}</span>
          </p>
        )}
        {subtitle && (
          <div className="mt-0.5">{subtitle}</div>
        )}
      </div>

      {trailing && <div className="shrink-0">{trailing}</div>}
    </>
  );

  const className =
    "flex items-start gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors group w-full text-left";

  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return (
    <Link to={`/events/${id}`} className={className}>
      {content}
    </Link>
  );
};

export default EventListItem;
