import { useEffect, useRef, useCallback, useState } from "react";
import WelcomeTour from "@/components/WelcomeTour";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import CreatePost from "@/components/CreatePost";
import Post from "@/components/Post";
import Stories from "@/components/Stories";
import MemoriesCard from "@/components/MemoriesCard";

import SponsoredPostCard from "@/components/SponsoredPostCard";
import HorizontalBannerAd from "@/components/ads/HorizontalBannerAd";
import { useSponsoredPosts } from "@/hooks/useSponsoredPosts";

import { Loader2, ArrowUp } from "lucide-react";
import useMemoriesNotification from "@/hooks/useMemoriesNotification";
import { useAuth } from "@/hooks/useAuth";


const PAGE_SIZE = 10;

const fetchPostsPage = async ({ pageParam, myGroupIds, followedPageIds, allowedUserIds }: { pageParam: number; myGroupIds: string[]; followedPageIds: string[]; allowedUserIds: string[] }) => {
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Fetch regular posts, group posts, and page posts in parallel
  const regularPostsPromise = allowedUserIds.length > 0
    ? supabase
        .from("posts")
        .select("*")
        .in("user_id", allowedUserIds)
        .order("created_at", { ascending: false })
        .range(from, to)
    : Promise.resolve({ data: [], error: null });

  const groupPostsPromise = myGroupIds.length > 0
    ? supabase.from("group_posts").select("*").in("group_id", myGroupIds).order("created_at", { ascending: false }).range(from, to)
    : Promise.resolve({ data: [], error: null });

  const pagePostsPromise = followedPageIds.length > 0
    ? supabase.from("page_posts").select("*").in("page_id", followedPageIds).order("created_at", { ascending: false }).range(from, to)
    : Promise.resolve({ data: [], error: null });

  const [regularRes, groupRes, pageRes] = await Promise.all([regularPostsPromise, groupPostsPromise, pagePostsPromise]);
  if (regularRes.error) throw regularRes.error;

  const regularPosts = regularRes.data || [];
  const groupPostsData = groupRes.data || [];
  const pagePostsData = pageRes.data || [];

  // Collect all user IDs, group IDs, and page IDs
  const allPosts = [...regularPosts, ...groupPostsData, ...pagePostsData];
  const userIds = [...new Set(allPosts.map((p: any) => p.user_id || p.created_by).filter(Boolean))];
  const groupIds = [...new Set(groupPostsData.map((p: any) => p.group_id))];
  const pageIds = [...new Set(pagePostsData.map((p: any) => p.page_id))];

  // Fetch profiles, groups, and pages in parallel
  const [profilesRes, groupsRes, pagesRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds)
      : { data: [] },
    groupIds.length > 0
      ? supabase.from("groups").select("id, name, avatar_url").in("id", groupIds)
      : { data: [] },
    pageIds.length > 0
      ? supabase.from("pages").select("id, name, slug, avatar_url, category").in("id", pageIds)
      : { data: [] },
  ]);

  const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
  const groupMap = new Map((groupsRes.data || []).map((g: any) => [g.id, g]));
  const pageMap = new Map((pagesRes.data || []).map((p: any) => [p.id, p]));

  // Normalize regular posts
  const normalizedRegular = regularPosts.map((post: any) => ({
    ...post,
    _source: "post" as const,
    profiles: profileMap.get(post.user_id) || null,
  }));

  // Normalize group posts
  const normalizedGroup = groupPostsData.map((post: any) => ({
    ...post,
    _source: "group_post" as const,
    profiles: profileMap.get(post.user_id) || null,
    group: groupMap.get(post.group_id) || null,
    video_url: null,
    shared_post_id: null,
  }));

  // Normalize page posts
  const normalizedPage = pagePostsData.map((post: any) => ({
    ...post,
    _source: "page_post" as const,
    user_id: post.created_by,
    profiles: profileMap.get(post.created_by) || null,
    page: pageMap.get(post.page_id) || null,
    video_url: null,
    shared_post_id: null,
    shared_group_post_id: null,
  }));

  // Merge and sort by created_at descending
  const merged = [...normalizedRegular, ...normalizedGroup, ...normalizedPage]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, PAGE_SIZE);

  return merged;
};

const Index = () => {
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const highlightPostId = searchParams.get("post");
  const highlightSource = searchParams.get("source"); // "group" | "page" | null
  const createAction = searchParams.get("create"); // "post" | "story" | null
  const highlightedRef = useRef<HTMLDivElement>(null);
  const [highlightFading, setHighlightFading] = useState(false);
  const scrollAttempted = useRef(false);

  // Fetch the specific highlighted post directly if needed
  const { data: directPost } = useQuery({
    queryKey: ["direct-post", highlightPostId, highlightSource],
    queryFn: async () => {
      if (!highlightPostId) return null;

      // Determine which table to query
      const table = highlightSource === "group" ? "group_posts" : highlightSource === "page" ? "page_posts" : "posts";
      const { data, error } = await supabase.from(table).select("*").eq("id", highlightPostId).maybeSingle();
      if (error || !data) return null;

      // Fetch profile
      const userId = (data as any).user_id || (data as any).created_by;
      const { data: profileData } = await supabase.from("profiles").select("user_id, display_name, avatar_url").eq("user_id", userId).maybeSingle();

      // Fetch group/page info if needed
      let group = null;
      let page = null;
      if (highlightSource === "group" && (data as any).group_id) {
        const { data: g } = await supabase.from("groups").select("id, name, avatar_url").eq("id", (data as any).group_id).maybeSingle();
        group = g;
      }
      if (highlightSource === "page" && (data as any).page_id) {
        const { data: p } = await supabase.from("pages").select("id, name, slug, avatar_url, category").eq("id", (data as any).page_id).maybeSingle();
        page = p;
      }

      const source = highlightSource === "group" ? "group_post" : highlightSource === "page" ? "page_post" : "post";
      return {
        ...data,
        _source: source as "post" | "group_post" | "page_post",
        profiles: profileData || null,
        group,
        page,
        user_id: userId,
        video_url: (data as any).video_url || null,
        shared_post_id: (data as any).shared_post_id || null,
        shared_group_post_id: (data as any).shared_group_post_id || null,
      };
    },
    enabled: !!highlightPostId,
    staleTime: Infinity,
  });

  // Fetch user's group IDs, followed page IDs, hidden posts, snoozed users, blocked users in parallel
  const { data: myGroupIds = [] } = useQuery({
    queryKey: ["my-group-ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id)
        .eq("status", "approved");
      if (error) throw error;
      return (data || []).map((m: any) => m.group_id) as string[];
    },
    enabled: !!user,
  });

  const { data: followedPageIds = [] } = useQuery({
    queryKey: ["my-followed-page-ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("page_followers")
        .select("page_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []).map((f: any) => f.page_id) as string[];
    },
    enabled: !!user,
  });

  // Hidden posts
  const { data: hiddenPostIds = [] } = useQuery({
    queryKey: ["hidden-posts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("hidden_posts").select("post_id").eq("user_id", user.id);
      return (data || []).map((h: any) => h.post_id) as string[];
    },
    enabled: !!user,
  });

  // Snoozed users (only active snoozes)
  const { data: snoozedUserIds = [] } = useQuery({
    queryKey: ["snoozed-users", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("snoozed_users")
        .select("snoozed_user_id")
        .eq("user_id", user.id)
        .gte("snoozed_until", new Date().toISOString());
      return (data || []).map((s: any) => s.snoozed_user_id) as string[];
    },
    enabled: !!user,
  });

  // Blocked users
  const { data: blockedUserIds = [] } = useQuery({
    queryKey: ["blocked-users", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id);
      return (data || []).map((b: any) => b.blocked_id) as string[];
    },
    enabled: !!user,
  });

  // Fetch active sponsored posts (no category = show all)
  const { data: sponsoredPosts = [] } = useSponsoredPosts();

  const { data: myFriendIds = [] } = useQuery({
    queryKey: ["my-friend-ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");
      if (error) throw error;
      return (data || []).map((f: any) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      ) as string[];
    },
    enabled: !!user,
  });

  const allowedUserIds = user ? [user.id, ...myFriendIds] : [];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["posts", myGroupIds, followedPageIds, allowedUserIds],
    queryFn: ({ pageParam }) => fetchPostsPage({ pageParam, myGroupIds, followedPageIds, allowedUserIds }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
  });

  // Scroll to highlighted post once loaded, with fade-out animation
  useEffect(() => {
    if (!highlightPostId || scrollAttempted.current) return;
    if (!highlightedRef.current) return;

    scrollAttempted.current = true;
    setTimeout(() => {
      highlightedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      // Start fading the highlight after scroll completes
      setTimeout(() => setHighlightFading(true), 1500);
      // Clean up the query params after animation
      setTimeout(() => {
        setSearchParams({}, { replace: true });
        setHighlightFading(false);
        scrollAttempted.current = false;
      }, 3500);
    }, 400);
  }, [highlightPostId, data, directPost]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  useMemoriesNotification();

  // Welcome tour for first-time users
  const [showTour, setShowTour] = useState(false);
  useEffect(() => {
    if (!user) return;
    const tourKey = `socialpro_tour_completed_${user.id}`;
    if (!localStorage.getItem(tourKey)) {
      // Check if account was created recently (within last 5 minutes)
      const createdAt = new Date(user.created_at || "");
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
      if (diffMinutes < 30) {
        setShowTour(true);
      } else {
        localStorage.setItem(tourKey, "true");
      }
    }
  }, [user]);

  const handleTourComplete = () => {
    if (user) {
      localStorage.setItem(`socialpro_tour_completed_${user.id}`, "true");
    }
    setShowTour(false);
  };

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersect, { rootMargin: "300px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const feedPosts = (data?.pages.flat() ?? []).filter((post: any) => {
    // Filter out hidden posts
    if (hiddenPostIds.includes(post.id)) return false;
    // Filter out snoozed users
    const postUserId = post.user_id || post.created_by;
    if (snoozedUserIds.includes(postUserId)) return false;
    // Filter out blocked users
    if (blockedUserIds.includes(postUserId)) return false;
    return true;
  });

  // Merge direct post at the top if it's not already in the feed
  const posts = (() => {
    if (!highlightPostId || !directPost) return feedPosts;
    const alreadyInFeed = feedPosts.some((p: any) => p.id === highlightPostId);
    if (alreadyInFeed) return feedPosts;
    return [directPost, ...feedPosts];
  })();

  return (
    <>
      {showTour && <WelcomeTour onComplete={handleTourComplete} />}
      <main className="w-full">
        <div className="max-w-[680px] mx-auto px-4 py-6 space-y-4">
          <Stories autoCreate={createAction === "story"} />
          <MemoriesCard />
          <HorizontalBannerAd variant="slim" className="my-2" />
          <CreatePost onPostCreated={() => { refetch(); setSearchParams({}, { replace: true }); }} autoOpen={createAction === "post"} />
          {posts.map((post, index) => {
            const isHighlighted = highlightPostId === post.id;
            return (
              <div
                key={`${post._source || 'post'}-${post.id}`}
                ref={isHighlighted ? highlightedRef : undefined}
                className={isHighlighted ? `rounded-xl transition-all duration-1000 ${highlightFading ? "ring-0 ring-transparent bg-transparent" : "ring-2 ring-primary bg-primary/5"}` : ""}
              >
                <Post
                  id={post.id}
                  postUserId={post.user_id}
                  author={
                    post._source === "page_post" && post.page
                      ? post.page.name
                      : post.profiles?.display_name || "Usuário Desconhecido"
                  }
                  avatarUrl={
                    post._source === "page_post" && post.page
                      ? post.page.avatar_url
                      : post.profiles?.avatar_url
                  }
                  createdAt={post.created_at}
                  updatedAt={post.updated_at}
                  content={post.content}
                  image={post.image_url}
                  imageUrls={(post as any).image_urls || []}
                  videoUrl={(post as any).video_url || null}
                  commentCount={0}
                  sharedPostId={post.shared_post_id}
                  sharedGroupPostId={(post as any).shared_group_post_id || null}
                  sharedPagePostId={(post as any).shared_page_post_id || null}
                  groupId={post._source === "group_post" ? post.group_id : undefined}
                  groupName={post._source === "group_post" ? post.group?.name : undefined}
                  groupAvatarUrl={post._source === "group_post" ? post.group?.avatar_url : undefined}
                  pageId={post._source === "page_post" ? post.page_id : undefined}
                  pageName={post._source === "page_post" ? post.page?.name : undefined}
                  pageSlug={post._source === "page_post" ? post.page?.slug : undefined}
                  pageAvatarUrl={post._source === "page_post" ? post.page?.avatar_url : undefined}
                  privacy={(post as any).privacy || "public"}
                  backgroundStyle={(post as any).background_style || null}
                  location={(post as any).location || null}
                  feeling={(post as any).feeling || null}
                />
                {sponsoredPosts.length > 0 && (index + 1) % 3 === 0 && sponsoredPosts[Math.floor(index / 3) % sponsoredPosts.length] && (
                  <div className="mt-4">
                    <SponsoredPostCard post={sponsoredPosts[Math.floor(index / 3) % sponsoredPosts.length]} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="py-4 flex justify-center">
            {isFetchingNextPage && (
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            )}
            {!hasNextPage && posts.length > 0 && (
              <p className="text-sm text-muted-foreground">Você chegou ao fim</p>
            )}
          </div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          )}

          {!isLoading && posts.length === 0 && !isFetchingNextPage && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">Nenhuma publicação ainda. Seja o primeiro a compartilhar algo!</p>
            </div>
          )}
        </div>
      </main>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-300 hover:opacity-90 ${showBackToTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        aria-label="Voltar ao topo"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </>
  );
};

export default Index;
