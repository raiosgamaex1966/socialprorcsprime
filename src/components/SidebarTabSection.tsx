import { type LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

interface SidebarTabSectionProps {
  icon: LucideIcon;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}

const SidebarTabSection = ({
  icon: Icon,
  title,
  actionLabel,
  onAction,
  children,
  emptyMessage = "Nothing to show",
  isEmpty,
}: SidebarTabSectionProps) => {
  return (
    <div className="rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="text-xs text-primary font-medium hover:text-primary/80 flex items-center gap-0.5 transition-colors"
          >
            {actionLabel} <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Content */}
      {isEmpty ? (
        <p className="text-xs text-muted-foreground text-center py-6">{emptyMessage}</p>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
};

export default SidebarTabSection;
