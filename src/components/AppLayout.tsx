import { Outlet, useLocation } from "react-router-dom";
import Header from "@/components/Header";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import InterstitialAd from "@/components/ads/InterstitialAd";
import { useInterstitialAd } from "@/hooks/useInterstitialAd";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import PWAStatusBanner from "@/components/PWAStatusBanner";

const AppLayout = () => {
  const { activeAd, dismiss } = useInterstitialAd();
  const { pathname } = useLocation();
  const isMessages = pathname === "/messages";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="fixed top-14 inset-x-0 bottom-0 flex flex-col overflow-hidden">
        <PWAStatusBanner />
        <div className="flex-1 flex overflow-hidden">
          {!isMessages && <LeftSidebar />}
          {isMessages ? (
            <div className="flex-1 h-full">
              <Outlet />
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <Outlet />
            </ScrollArea>
          )}
          {!isMessages && <RightSidebar />}
        </div>
      </div>
      {activeAd && <InterstitialAd ad={activeAd} onClose={dismiss} />}
      <PWAInstallPrompt />
    </div>
  );
};

export default AppLayout;
