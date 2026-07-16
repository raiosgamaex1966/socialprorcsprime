import { BadgeCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

const VerifiedBadge = ({ size = "sm", className = "" }: VerifiedBadgeProps) => {
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center ${className}`}>
            <BadgeCheck className={`${iconSize} text-primary fill-primary/20`} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Verified Seller
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VerifiedBadge;
