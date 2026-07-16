import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

interface SidebarSectionProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}

const SidebarSection = ({ title, icon: Icon, children }: SidebarSectionProps) => (
  <div>
    <div className="flex items-center gap-1.5 px-2 mb-2">
      <Icon className="w-4 h-4 text-primary" />
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
    </div>
    <div className="px-1">{children}</div>
  </div>
);

export default SidebarSection;
