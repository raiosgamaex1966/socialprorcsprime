import { MapPin, X } from "lucide-react";

interface CheckIn {
  id: string;
  name: string;
  lat: number;
  lng: number;
  date: string;
  note?: string;
}

interface CheckInListProps {
  checkIns: CheckIn[];
  isOwn: boolean;
  onRemove: (id: string) => void;
}

const CheckInList = ({ checkIns, isOwn, onRemove }: CheckInListProps) => {
  if (checkIns.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border/50 p-8 text-center">
        <MapPin className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          {isOwn ? "You haven't checked in anywhere yet" : "No check-ins to show"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border/50 p-4 space-y-2">
      <h4 className="text-sm font-semibold text-foreground mb-2">Recent Places</h4>
      {checkIns.map((ci) => (
        <div
          key={ci.id}
          className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
        >
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{ci.name}</p>
            {ci.note && <p className="text-xs text-muted-foreground mt-0.5">{ci.note}</p>}
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {new Date(ci.date).toLocaleDateString()}
            </p>
          </div>
          {isOwn && (
            <button
              onClick={() => onRemove(ci.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default CheckInList;
