import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive";
  disabled?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
}

export function BulkActionBar({ selectedCount, actions, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <div className="h-4 w-px bg-primary-foreground/30" />
      {actions.map((action, i) => (
        <Button
          key={i}
          size="sm"
          variant={action.variant === "destructive" ? "destructive" : "secondary"}
          onClick={action.onClick}
          disabled={action.disabled}
          className="h-8"
        >
          {action.icon}
          {action.label}
        </Button>
      ))}
      <Button size="icon" variant="ghost" onClick={onClear} className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
