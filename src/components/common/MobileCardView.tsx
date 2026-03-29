import { ReactNode } from "react";

interface MobileCardViewProps<T> {
  data: T[];
  renderCard: (item: T) => ReactNode;
  emptyState?: ReactNode;
  className?: string;
}

export function MobileCardView<T>({ data, renderCard, emptyState, className }: MobileCardViewProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {data.map((item, i) => (
        <div key={i}>{renderCard(item)}</div>
      ))}
    </div>
  );
}
