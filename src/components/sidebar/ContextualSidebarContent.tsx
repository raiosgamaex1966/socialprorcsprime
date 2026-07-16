import { useLocation } from "react-router-dom";
import MarketplaceContextSidebar from "./MarketplaceContextSidebar";
import EventsContextSidebar from "./EventsContextSidebar";
import GroupsContextSidebar from "./GroupsContextSidebar";
import PagesContextSidebar from "./PagesContextSidebar";
import FriendsContextSidebar from "./FriendsContextSidebar";

const ContextualSidebarContent = () => {
  const { pathname } = useLocation();

  if (pathname === "/marketplace" || pathname.startsWith("/marketplace/")) {
    return <MarketplaceContextSidebar />;
  }
  if (pathname === "/events" || pathname.startsWith("/events/")) {
    return <EventsContextSidebar />;
  }
  if (pathname === "/groups" || pathname.startsWith("/groups/")) {
    return <GroupsContextSidebar />;
  }
  if (pathname === "/pages" || pathname.startsWith("/pages/")) {
    return <PagesContextSidebar />;
  }
  if (pathname === "/friends") {
    return <FriendsContextSidebar />;
  }

  return null;
};

export default ContextualSidebarContent;
