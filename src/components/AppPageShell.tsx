import { type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppPageShellProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  as?: ElementType;
}

const AppPageShell = ({
  children,
  className,
  contentClassName,
  as: Component = "main",
}: AppPageShellProps) => {
  return (
    <Component
      className={cn(
        "w-full",
        className,
      )}
    >
      <div className={cn("w-full max-w-[920px] mx-auto px-4 py-6", contentClassName)}>{children}</div>
    </Component>
  );
};

export default AppPageShell;
