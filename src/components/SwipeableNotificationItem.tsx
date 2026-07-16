import { useRef, useState, useCallback } from "react";
import { X } from "lucide-react";

interface SwipeableNotificationItemProps {
  children: React.ReactNode;
  onDismiss: () => void;
  className?: string;
}

const SWIPE_THRESHOLD = 100;

const SwipeableNotificationItem = ({ children, onDismiss, className = "" }: SwipeableNotificationItemProps) => {
  const startXRef = useRef<number | null>(null);
  const currentXRef = useRef(0);
  const itemRef = useRef<HTMLDivElement>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current === null) return;
    const diff = e.touches[0].clientX - startXRef.current;
    // Only allow swiping left
    const offset = Math.min(0, diff);
    currentXRef.current = offset;
    if (itemRef.current) {
      itemRef.current.style.transform = `translateX(${offset}px)`;
      itemRef.current.style.transition = "none";
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    startXRef.current = null;
    if (itemRef.current) {
      itemRef.current.style.transition = "transform 300ms ease, opacity 300ms ease";
      if (currentXRef.current < -SWIPE_THRESHOLD) {
        setIsDismissing(true);
        itemRef.current.style.transform = "translateX(-100%)";
        itemRef.current.style.opacity = "0";
        setTimeout(onDismiss, 300);
      } else {
        itemRef.current.style.transform = "translateX(0)";
      }
    }
    currentXRef.current = 0;
  }, [onDismiss]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissing(true);
    if (itemRef.current) {
      itemRef.current.style.transition = "transform 300ms ease, opacity 300ms ease";
      itemRef.current.style.transform = "translateX(-100%)";
      itemRef.current.style.opacity = "0";
    }
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

  if (isDismissing) {
    return (
      <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: 0 }}>
        <div ref={itemRef} className={className}>{children}</div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden group">
      {/* Delete background (swipe only) */}
      <div className="absolute inset-0 bg-destructive flex items-center justify-end pr-6 pointer-events-none">
        <X className="w-5 h-5 text-destructive-foreground" />
      </div>

      <div
        ref={itemRef}
        className={`relative ${className}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}

        {/* Desktop delete button — single instance */}
        <button
          onClick={handleDeleteClick}
          className="absolute top-1/2 -translate-y-1/2 right-3 w-7 h-7 rounded-full bg-secondary hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default SwipeableNotificationItem;
