import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Heart, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { useAuth } from "@/hooks/useAuth";

const TrendingPosts = () => {
  const { user } = useAuth();

  const { data: trending = [] } = useQuery({
    queryKey: ["sidebar-trending-posts", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get accepted friends of the logged-in user
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");

      const friendIds = friendships?.map((f: any) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      ) || [];
      const allowedUserIds = [user.id, ...friendIds];

      // Get recent posts (last 7 days) by allowed users
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: recentPosts } = await supabase
        .from("posts")
        .select("id")
        .in("user_id", allowedUserIds)
        .gte("created_at", weekAgo);

      const recentPostIds = recentPosts?.map((p) => p.id) || [];
      if (!recentPostIds.length) return [];

      const { data: likes } = await supabase
        .from("post_likes")
        .select("post_id")
        .in("post_id", recentPostIds)
        .gte("created_at", weekAgo);

      const { data: comments } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", recentPostIds)
        .gte("created_at", weekAgo);

      // Score posts
      const scores: Record<string, { likes: number; comments: number; score: number }> = {};
      likes?.forEach((l) => {
        if (!scores[l.post_id]) scores[l.post_id] = { likes: 0, comments: 0, score: 0 };
        scores[l.post_id].likes++;
        scores[l.post_id].score += 2;
      });
      comments?.forEach((c) => {
        if (!scores[c.post_id]) scores[c.post_id] = { likes: 0, comments: 0, score: 0 };
        scores[c.post_id].comments++;
        scores[c.post_id].score += 3;
      });

      const topIds = Object.entries(scores)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([id]) => id);

      if (!topIds.length) return [];

      const { data: posts } = await supabase
        .from("posts")
        .select("id, content, user_id, image_url")
        .in("id", topIds);

      if (!posts?.length) return [];

      const userIds = [...new Set(posts.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return topIds
        .map((id) => {
          const post = posts.find((p) => p.id === id);
          if (!post) return null;
          const profile = profileMap.get(post.user_id);
          return {
            id: post.id,
            content: post.content,
            hasImage: !!post.image_url,
            authorName: profile?.display_name || "Usuário",
            authorAvatar: profile?.avatar_url,
            likes: scores[id]?.likes || 0,
            comments: scores[id]?.comments || 0,
          };
        })
        .filter(Boolean);
    },
    staleTime: 120000,
  });

  if (trending.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 px-2 mb-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-[15px] font-semibold text-foreground">Publicações em Destaque</h3>
      </div>
      <div className="space-y-1.5 px-1">
        {trending.map((post: any) => (
          <div
            key={post.id}
            className="flex gap-2.5 p-2 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
          >
            <img
              src={post.authorAvatar || defaultAvatar}
              alt={post.authorName}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground">{post.authorName}</p>
              <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">{post.content}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Heart className="w-3 h-3" /> {post.likes}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MessageCircle className="w-3 h-3" /> {post.comments}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendingPosts;
