import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarStateProvider } from "@/hooks/useSidebarState";
import { AuthProvider } from "@/hooks/useAuth";
import { OnlinePresenceProvider } from "@/hooks/useOnlinePresence";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Profile from "./pages/Profile.tsx";
import Friends from "./pages/Friends.tsx";
import Marketplace from "./pages/Marketplace.tsx";
import ListingDetail from "./pages/ListingDetail.tsx";
import Messages from "./pages/Messages.tsx";
import Saved from "./pages/Saved.tsx";
import Notifications from "./pages/Notifications.tsx";
import Memories from "./pages/Memories.tsx";
import Groups from "./pages/Groups.tsx";
import GroupDetail from "./pages/GroupDetail.tsx";
import GroupInvite from "./pages/GroupInvite.tsx";
import Pages from "./pages/Pages.tsx";
import PageDetail from "./pages/PageDetail.tsx";
import Events from "./pages/Events.tsx";
import EventDetail from "./pages/EventDetail.tsx";
import SafetyCenter from "./pages/SafetyCenter.tsx";
import Moderation from "./pages/Moderation.tsx";
import Settings from "./pages/Settings.tsx";
import ActivityLog from "./pages/ActivityLog.tsx";
import Reels from "./pages/Reels.tsx";
import Watch from "./pages/Watch.tsx";
import Advertising from "./pages/Advertising.tsx";
import Credits from "./pages/Credits.tsx";
import CmsPage from "./pages/CmsPage.tsx";
import ModeratorPanel from "./pages/ModeratorPanel.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Hashtag from "./pages/Hashtag.tsx";
import NotFound from "./pages/NotFound.tsx";
import Setup from "./pages/Setup.tsx";
import InstallApp from "./pages/InstallApp.tsx";

import { useCustomCodeInjection } from "@/hooks/useCustomCodeInjection";

const queryClient = new QueryClient();

const App = () => {
  useCustomCodeInjection();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <OnlinePresenceProvider>
          <SidebarStateProvider>
            <Routes>
              <Route path="/setup" element={<Setup />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/install" element={<InstallApp />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/" element={<Index />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/marketplace/:listingId" element={<ListingDetail />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/saved" element={<Saved />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/memories" element={<Memories />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:eventId" element={<EventDetail />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/groups/:groupId" element={<GroupDetail />} />
                <Route path="/groups/invite/:code" element={<GroupInvite />} />
                <Route path="/pages" element={<Pages />} />
                <Route path="/pages/:slug" element={<PageDetail />} />
                <Route path="/safety" element={<SafetyCenter />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/activity-log" element={<ActivityLog />} />
                <Route path="/reels" element={<Reels />} />
                <Route path="/watch" element={<Watch />} />
              <Route path="/advertising" element={<Advertising />} />
                <Route path="/credits" element={<Credits />} />
                <Route path="/hashtag/:tag" element={<Hashtag />} />
                <Route path="/page/:slug" element={<CmsPage />} />
              </Route>
              <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Moderation /></ProtectedRoute>} />
              <Route path="/moderator" element={<ProtectedRoute requiredRole="moderator"><ModeratorPanel /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SidebarStateProvider>
          </OnlinePresenceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
