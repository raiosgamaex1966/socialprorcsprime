import { useState, useMemo, useCallback, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, MoreHorizontal, X, Megaphone, ChevronRight } from "lucide-react";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { useSponsoredPosts } from "@/hooks/useSponsoredPosts";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import PeopleYouMayKnow from "@/components/sidebar/PeopleYouMayKnow";
import TrendingPosts from "@/components/sidebar/TrendingPosts";
import PageRecommendations from "@/components/PageRecommendations";
import GroupActivityFeed from "@/components/GroupActivityFeed";
import ThisWeekEvents from "@/components/ThisWeekEvents";
import ContextualSidebarContent from "@/components/sidebar/ContextualSidebarContent";

const SectionDivider = () => <div className="border-t border-border my-3" />;

const RightSidebar = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: sponsoredPosts = [] } = useSponsoredPosts();

  // Contacts data
  const { data: friends = [], isLoading } = useQuery({
    queryKey: ["friends-contacts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!friendships?.length) return [];

      const friendIds = friendships.map((f) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, last_seen_at")
        .in("user_id", friendIds);

      return (profiles || []).map((p) => ({
        userId: p.user_id,
        name: p.display_name || "Usuário",
        avatar: p.avatar_url,
        isOnline: p.last_seen_at
          ? Date.now() - new Date(p.last_seen_at).getTime() < 5 * 60 * 1000
          : false,
      }));
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("friends-contacts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships" },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (row?.requester_id === user.id || row?.addressee_id === user.id) {
            queryClient.invalidateQueries({ queryKey: ["friends-contacts", user.id] });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const onlineContacts = useMemo(
    () => friends.filter((f) => f.isOnline),
    [friends]
  );

  const filteredContacts = useMemo(
    () => friends
      .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => Number(b.isOnline) - Number(a.isOnline)),
    [searchQuery, friends]
  );

  const openDmWith = useCallback(async (friendId: string) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("is_group", false)
      .or(
        `and(participant_one.eq.${user.id},participant_two.eq.${friendId}),and(participant_one.eq.${friendId},participant_two.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      navigate(`/messages?conversation=${existing.id}`);
      return;
    }

    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({ participant_one: user.id, participant_two: friendId })
      .select("id")
      .single();

    if (error) {
      toast.error("Não foi possível abrir a conversa");
      return;
    }
    navigate(`/messages?conversation=${newConv.id}`);
  }, [user, navigate]);

  const sidebarAd = sponsoredPosts[0];
  const secondAd = sponsoredPosts[1];

  // Determine which sections to show based on route
  const isHome = pathname === "/";
  const isProfile = pathname.startsWith("/profile");
  const isFriends = pathname === "/friends";
  const isGroups = pathname === "/groups" || pathname.startsWith("/groups/");
  const isPages = pathname === "/pages" || pathname.startsWith("/pages/");
  const isEvents = pathname === "/events" || pathname.startsWith("/events/");
  const isMarketplace = pathname === "/marketplace" || pathname.startsWith("/marketplace/");

  return (
    <ScrollArea className="w-[350px] flex-shrink-0 h-full hidden xl:block bg-card">
      <div className="p-3">

        {/* Sponsored Ad */}
        {sidebarAd && (
          <div className="mb-1">
            <h3 className="text-muted-foreground font-semibold text-[13px] uppercase tracking-wide px-2 mb-2">Patrocinado</h3>
            <a
              href={sidebarAd.link_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-2 rounded-xl hover:bg-secondary transition-colors cursor-pointer no-underline"
            >
              {sidebarAd.image_url ? (
                <img src={sidebarAd.image_url} alt="" className="w-[120px] h-[120px] rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-[120px] h-[120px] bg-secondary rounded-lg flex-shrink-0 flex items-center justify-center">
                  <Megaphone className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 pt-1">
                <p className="text-[14px] font-medium text-foreground line-clamp-2">{sidebarAd.content}</p>
                {sidebarAd.link_url && (
                  <p className="text-[12px] text-muted-foreground truncate mt-1">{(() => { try { return new URL(sidebarAd.link_url).hostname; } catch { return sidebarAd.link_url; } })()}</p>
                )}
              </div>
            </a>
          </div>
        )}

        {sidebarAd && <SectionDivider />}

        {/* Contextual content (route-specific) */}
        <ContextualSidebarContent />

        {/* People You May Know - show on home, profile (friends contextual sidebar already has this) */}
        {(isHome || isProfile) && (
          <PeopleYouMayKnow />
        )}

        {/* Trending Posts - show on home */}
        {isHome && (
          <TrendingPosts />
        )}

        {/* Suggested Pages - home only (pages contextual sidebar already has this) */}
        {isHome && (
          <>
            <SectionDivider />
            <div className="mb-1">
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Páginas Sugeridas</h3>
                <button onClick={() => navigate("/pages")} className="text-[12px] text-primary hover:underline flex items-center gap-0.5">
                  Ver Tudo <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <PageRecommendations />
            </div>
          </>
        )}

        {/* Suggested Groups - home only (groups contextual sidebar already has this) */}
        {isHome && (
          <>
            <SectionDivider />
            <div className="mb-1">
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Grupos Sugeridos</h3>
                <button onClick={() => navigate("/groups")} className="text-[12px] text-primary hover:underline flex items-center gap-0.5">
                  Ver Tudo <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <GroupActivityFeed />
            </div>
          </>
        )}

        {/* Upcoming Events - home only (events contextual sidebar already has this) */}
        {isHome && (
          <>
            <SectionDivider />
            <div className="mb-1">
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">Próximos Eventos</h3>
                <button onClick={() => navigate("/events")} className="text-[12px] text-primary hover:underline flex items-center gap-0.5">
                  Ver Tudo <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <ThisWeekEvents />
            </div>
          </>
        )}

        {/* Second sponsored ad */}
        {secondAd && (
          <>
            <SectionDivider />
            <div className="mb-1">
              <h3 className="text-muted-foreground font-semibold text-[13px] uppercase tracking-wide px-2 mb-2">Patrocinado</h3>
              <a
                href={secondAd.link_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-2 rounded-xl hover:bg-secondary transition-colors cursor-pointer no-underline"
              >
                {secondAd.image_url ? (
                  <img src={secondAd.image_url} alt="" className="w-[120px] h-[120px] rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-[120px] h-[120px] bg-secondary rounded-lg flex-shrink-0 flex items-center justify-center">
                    <Megaphone className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 pt-1">
                  <p className="text-[14px] font-medium text-foreground line-clamp-2">{secondAd.content}</p>
                  {secondAd.link_url && (
                    <p className="text-[12px] text-muted-foreground truncate mt-1">{(() => { try { return new URL(secondAd.link_url).hostname; } catch { return secondAd.link_url; } })()}</p>
                  )}
                </div>
              </a>
            </div>
          </>
        )}

        {/* Contacts */}
        <SectionDivider />
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            {searchOpen ? (
              <div className="flex items-center gap-1.5 flex-1 bg-secondary rounded-full px-3 py-1">
                <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar contatos..."
                  className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
                />
                <button
                  onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                  className="flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Contatos {onlineContacts.length > 0 && <span className="text-primary">· {onlineContacts.length} online</span>}
                </h3>
                <div className="flex gap-1">
                  <button onClick={() => setSearchOpen(true)} className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center">
                    <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="space-y-0.5">
            {isLoading && (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))
            )}
            {!isLoading && filteredContacts.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-3 text-center">
                {friends.length === 0 ? "Nenhum amigo ainda" : "Nenhum contato encontrado"}
              </p>
            )}
            {filteredContacts.map((friend) => (
              <button
                key={friend.userId}
                onClick={() => openDmWith(friend.userId)}
                className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-secondary transition-colors text-left"
              >
                <div className="relative flex-shrink-0">
                  <img src={friend.avatar || defaultAvatar} alt={friend.name} className="w-9 h-9 rounded-full object-cover" loading="lazy" width={36} height={36} />
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${friend.isOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-medium text-foreground block truncate">{friend.name}</span>
                  <span className={`text-[11px] ${friend.isOnline ? "text-green-500" : "text-muted-foreground"}`}>
                    {friend.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>


      </div>
    </ScrollArea>
  );
};

export default RightSidebar;
