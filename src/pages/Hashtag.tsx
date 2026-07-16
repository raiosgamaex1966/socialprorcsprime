import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Post from "@/components/Post";
import { Hash, TrendingUp, Loader2, ArrowLeft, Users, Clock, Flame } from "lucide-react";

const PAGE_SIZE = 10;

const Hashtag = () => {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const decodedTag = tag ? decodeURIComponent(tag) : "";
  const hashTag = `#${decodedTag}`;

  // Query user relations
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

  // Fetch posts containing the hashtag
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["hashtag-posts", decodedTag, allowedUserIds, myGroupIds, followedPageIds],
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Search regular posts, group posts, and page posts in parallel
      const regularPostsPromise = allowedUserIds.length > 0
        ? supabase
            .from("posts")
            .select("*")
            .in("user_id", allowedUserIds)
            .ilike("content", `%#${decodedTag}%`)
            .order("created_at", { ascending: false })
            .range(from, to)
        : Promise.resolve({ data: [], error: null });

      const groupPostsPromise = myGroupIds.length > 0
        ? supabase
            .from("group_posts")
            .select("*")
            .in("group_id", myGroupIds)
            .ilike("content", `%#${decodedTag}%`)
            .order("created_at", { ascending: false })
            .range(from, to)
        : Promise.resolve({ data: [], error: null });

      const pagePostsPromise = followedPageIds.length > 0
        ? supabase
            .from("page_posts")
            .select("*")
            .in("page_id", followedPageIds)
            .ilike("content", `%#${decodedTag}%`)
            .order("created_at", { ascending: false })
            .range(from, to)
        : Promise.resolve({ data: [], error: null });

      const [regularRes, groupRes, pageRes] = await Promise.all([
        regularPostsPromise,
        groupPostsPromise,
        pagePostsPromise,
      ]);

      const regularPosts = regularRes.data || [];
      const groupPostsData = groupRes.data || [];
      const pagePostsData = pageRes.data || [];

      const allPosts = [...regularPosts, ...groupPostsData, ...pagePostsData];
      const userIds = [...new Set(allPosts.map((p: any) => p.user_id || p.created_by).filter(Boolean))];
      const groupIds = [...new Set(groupPostsData.map((p: any) => p.group_id))];
      const pageIds = [...new Set(pagePostsData.map((p: any) => p.page_id))];

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

      const normalizedRegular = regularPosts.map((post: any) => ({
        ...post,
        _source: "post" as const,
        profiles: profileMap.get(post.user_id) || null,
      }));

      const normalizedGroup = groupPostsData.map((post: any) => ({
        ...post,
        _source: "group_post" as const,
        profiles: profileMap.get(post.user_id) || null,
        group: groupMap.get(post.group_id) || null,
        video_url: null,
        shared_post_id: null,
      }));

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

      return [...normalizedRegular, ...normalizedGroup, ...normalizedPage]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, PAGE_SIZE);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    enabled: !!decodedTag && (allowedUserIds.length > 0 || myGroupIds.length > 0 || followedPageIds.length > 0),
  });

  // Stats: total post count for this tag
  const { data: stats } = useQuery({
    queryKey: ["hashtag-stats", decodedTag, allowedUserIds, myGroupIds, followedPageIds],
    queryFn: async () => {
      const regularPromise = allowedUserIds.length > 0
        ? supabase.from("posts").select("id", { count: "exact", head: true }).in("user_id", allowedUserIds).ilike("content", `%#${decodedTag}%`)
        : Promise.resolve({ count: 0 });

      const groupPromise = myGroupIds.length > 0
        ? supabase.from("group_posts").select("id", { count: "exact", head: true }).in("group_id", myGroupIds).ilike("content", `%#${decodedTag}%`)
        : Promise.resolve({ count: 0 });

      const pagePromise = followedPageIds.length > 0
        ? supabase.from("page_posts").select("id", { count: "exact", head: true }).in("page_id", followedPageIds).ilike("content", `%#${decodedTag}%`)
        : Promise.resolve({ count: 0 });

      const [r1, r2, r3] = await Promise.all([regularPromise, groupPromise, pagePromise]);
      const total = (r1.count || 0) + (r2.count || 0) + (r3.count || 0);

      // Unique authors
      const regularAuthorsPromise = allowedUserIds.length > 0
        ? supabase.from("posts").select("user_id").in("user_id", allowedUserIds).ilike("content", `%#${decodedTag}%`)
        : Promise.resolve({ data: [] });

      const groupAuthorsPromise = myGroupIds.length > 0
        ? supabase.from("group_posts").select("user_id").in("group_id", myGroupIds).ilike("content", `%#${decodedTag}%`)
        : Promise.resolve({ data: [] });

      const pageAuthorsPromise = followedPageIds.length > 0
        ? supabase.from("page_posts").select("created_by").in("page_id", followedPageIds).ilike("content", `%#${decodedTag}%`)
        : Promise.resolve({ data: [] });

      const [a1, a2, a3] = await Promise.all([regularAuthorsPromise, groupAuthorsPromise, pageAuthorsPromise]);
      const authorSet = new Set([
        ...(a1.data || []).map((a: any) => a.user_id),
        ...(a2.data || []).map((a: any) => a.user_id),
        ...(a3.data || []).map((a: any) => a.created_by),
      ]);

      return { totalPosts: total, uniqueAuthors: authorSet.size };
    },
    enabled: !!decodedTag && (allowedUserIds.length > 0 || myGroupIds.length > 0 || followedPageIds.length > 0),
  });

  // Trending related tags from recent posts
  const { data: relatedTags = [] } = useQuery({
    queryKey: ["hashtag-related", decodedTag, allowedUserIds],
    queryFn: async () => {
      if (allowedUserIds.length === 0) return [];
      const { data: posts } = await supabase
        .from("posts")
        .select("content")
        .in("user_id", allowedUserIds)
        .ilike("content", `%#${decodedTag}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!posts) return [];
      const tagCounts = new Map<string, number>();
      const regex = /#[a-zA-Z_]\w*/g;
      posts.forEach((p: any) => {
        const matches = p.content.match(regex) || [];
        matches.forEach((m: string) => {
          const lower = m.toLowerCase();
          if (lower !== `#${decodedTag.toLowerCase()}`) {
            tagCounts.set(lower, (tagCounts.get(lower) || 0) + 1);
          }
        });
      });
      return [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([tag, count]) => ({ tag, count }));
    },
    enabled: !!decodedTag && allowedUserIds.length > 0,
  });

  // Infinite scroll
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

  const posts = data?.pages.flat() ?? [];

  return (
    <main className="w-full">
      <div className="max-w-[680px] mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {/* Hero banner */}
          <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.15),transparent_70%)]" />
            <Hash className="w-16 h-16 text-primary/30" strokeWidth={1.5} />
          </div>

          <div className="p-5 -mt-8 relative">
            {/* Tag icon badge */}
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg mb-3">
              <Hash className="w-7 h-7" />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{hashTag}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Explore publicações, discussões e conteúdos marcados com {hashTag}
                </p>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="shrink-0 w-9 h-9 rounded-full bg-secondary hover:bg-muted flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Stats row */}
            {stats && (
              <div className="flex gap-5 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{stats.totalPosts.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Publicações</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center">
                    <Users className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{stats.uniqueAuthors.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Pessoas</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related tags */}
        {relatedTags.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Tags Relacionadas</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {relatedTags.map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => navigate(`/hashtag/${encodeURIComponent(tag.slice(1))}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-muted text-sm font-medium text-foreground transition-colors"
                >
                  <span>{tag}</span>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Posts feed */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <Hash className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground">Nenhuma publicação encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Seja o primeiro a usar {hashTag} na sua publicação!
            </p>
          </div>
        )}

        {posts.map((post: any) => (
          <Post
            key={`${post._source || "post"}-${post.id}`}
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
            imageUrls={post.image_urls || []}
            videoUrl={post.video_url || null}
            commentCount={0}
            sharedPostId={post.shared_post_id}
            sharedGroupPostId={post.shared_group_post_id || null}
            sharedPagePostId={post.shared_page_post_id || null}
            groupId={post._source === "group_post" ? post.group_id : undefined}
            groupName={post._source === "group_post" ? post.group?.name : undefined}
            groupAvatarUrl={post._source === "group_post" ? post.group?.avatar_url : undefined}
            pageId={post._source === "page_post" ? post.page_id : undefined}
            pageName={post._source === "page_post" ? post.page?.name : undefined}
            pageSlug={post._source === "page_post" ? post.page?.slug : undefined}
            pageAvatarUrl={post._source === "page_post" ? post.page?.avatar_url : undefined}
            privacy={post.privacy || "public"}
            backgroundStyle={post.background_style || null}
            location={post.location || null}
            feeling={post.feeling || null}
          />
        ))}

        <div ref={sentinelRef} className="py-4 flex justify-center">
          {isFetchingNextPage && (
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          )}
          {!hasNextPage && posts.length > 0 && (
            <p className="text-sm text-muted-foreground">Você chegou ao fim</p>
          )}
        </div>
      </div>
    </main>
  );
};

export default Hashtag;
