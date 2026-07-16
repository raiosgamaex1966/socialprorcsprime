import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, X, CheckCircle, XCircle } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
  allSelected?: boolean;
}

const BulkActionsBar = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  actions,
  allSelected,
}: BulkActionsBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
      <Checkbox
        checked={allSelected}
        onCheckedChange={(checked) => (checked ? onSelectAll() : onClearSelection())}
      />
      <span className="text-sm font-medium text-foreground">
        {selectedCount} de {totalCount} selecionados
      </span>
      <div className="flex items-center gap-1.5 ml-auto">
        {actions.map((action, i) => (
          <Button
            key={i}
            size="sm"
            variant={action.variant || "default"}
            className="h-7 text-xs"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onClearSelection}>
          <X className="w-3.5 h-3.5 mr-1" /> Limpar
        </Button>
      </div>
    </div>
  );
};

export default BulkActionsBar;
