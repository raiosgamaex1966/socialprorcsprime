import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface SidebarContextType {
  collapsed: boolean;
  isCollapsed: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  isCollapsed: false,
  mobileOpen: false,
  toggle: () => {},
  toggleMobile: () => {},
  closeMobile: () => {},
});

const MD_BREAKPOINT = 768;
const LG_BREAKPOINT = 1024;

export const SidebarStateProvider = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const [isMedium, setIsMedium] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= MD_BREAKPOINT && window.innerWidth < LG_BREAKPOINT;
  });

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsMedium(w >= MD_BREAKPOINT && w < LG_BREAKPOINT);
      // Close mobile drawer when resizing to desktop
      if (w >= MD_BREAKPOINT) setMobileOpen(false);
    };
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
      return next;
    });
  }, []);

  const toggleMobile = useCallback(() => setMobileOpen((prev) => !prev), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [toggle]);

  const isCollapsed = isMedium || collapsed;

  return (
    <SidebarContext.Provider value={{ collapsed, isCollapsed, mobileOpen, toggle, toggleMobile, closeMobile }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebarState = () => useContext(SidebarContext);
