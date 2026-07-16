import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProfileTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "posts", label: "Publicações" },
  { id: "about", label: "Sobre" },
  { id: "friends", label: "Amigos" },
  { id: "photos", label: "Fotos" },
  { id: "groups", label: "Grupos" },
  { id: "pages", label: "Páginas" },
  { id: "videos", label: "Vídeos" },
];

const moreTabs = [
  { id: "reels", label: "Reels" },
  { id: "check-ins", label: "Check-ins" },
  { id: "music", label: "Música" },
  { id: "events", label: "Eventos" },
  { id: "sports", label: "Esportes" },
  { id: "movies", label: "Filmes" },
  { id: "books", label: "Livros" },
  { id: "likes", label: "Curtidas" },
];

const ProfileTabBar = ({ activeTab, onTabChange }: ProfileTabBarProps) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const activeInMore = moreTabs.some((t) => t.id === activeTab);
  const moreLabel = activeInMore ? moreTabs.find((t) => t.id === activeTab)?.label : "Mais";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    if (moreOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex flex-wrap bg-secondary rounded-lg p-1 gap-0.5 w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-2.5 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* More dropdown */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex items-center gap-1 px-2.5 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeInMore
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {moreLabel}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-card rounded-lg shadow-lg border border-border/50 py-1">
              {moreTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { onTabChange(tab.id); setMoreOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "text-primary bg-primary/5"
                      : "text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileTabBar;
