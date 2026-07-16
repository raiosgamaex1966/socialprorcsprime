import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Users, MessageCircle, ThumbsUp, FileText, Trophy, Flame, ArrowUpRight, ImageIcon } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface PageAnalyticsProps {
  pageId: string;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  trend?: string;
}) => (
  <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
      <Icon className="w-6 h-6 text-primary" />
    </div>
    <div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {trend && <p className="text-xs font-medium text-green-500 mt-0.5">{trend}</p>}
    </div>
  </div>
);

const PageAnalytics = ({ pageId }: PageAnalyticsProps) => {
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  const sevenDaysAgo = subDays(now, 7);

  // Follower data
  const { data: followers = [] } = useQuery({
    queryKey: ["page-analytics-followers", pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_followers")
        .select("created_at")
        .eq("page_id", pageId)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: totalFollowers = 0 } = useQuery({
    queryKey: ["page-analytics-total-followers", pageId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("page_followers")
        .select("*", { count: "exact", head: true })
        .eq("page_id", pageId);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Posts data
  const { data: posts = [] } = useQuery({
    queryKey: ["page-analytics-posts", pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_posts")
        .select("id, created_at, content, image_url")
        .eq("page_id", pageId);
      if (error) throw error;
      return data || [];
    },
  });

  // Likes data
  const { data: likes = [] } = useQuery({
    queryKey: ["page-analytics-likes", pageId],
    queryFn: async () => {
      const postIds = posts.map((p) => p.id);
      if (postIds.length === 0) return [];
      const { data, error } = await supabase
        .from("page_post_likes")
        .select("created_at, page_post_id")
        .in("page_post_id", postIds);
      if (error) throw error;
      return data || [];
    },
    enabled: posts.length > 0,
  });

  // Comments data
  const { data: comments = [] } = useQuery({
    queryKey: ["page-analytics-comments", pageId],
    queryFn: async () => {
      const postIds = posts.map((p) => p.id);
      if (postIds.length === 0) return [];
      const { data, error } = await supabase
        .from("page_post_comments")
        .select("created_at, page_post_id")
        .in("page_post_id", postIds);
      if (error) throw error;
      return data || [];
    },
    enabled: posts.length > 0,
  });

  // Build follower growth chart data (last 30 days)
  const days = eachDayOfInterval({ start: thirtyDaysAgo, end: now });
  const followerGrowthData = days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const count = followers.filter((f) => {
      const d = new Date(f.created_at);
      return d >= dayStart && d < dayEnd;
    }).length;
    return { date: format(day, "MMM d"), followers: count };
  });

  // Build engagement chart data (last 30 days)
  const engagementData = days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dayLikes = likes.filter((l) => {
      const d = new Date(l.created_at);
      return d >= dayStart && d < dayEnd;
    }).length;
    const dayComments = comments.filter((c) => {
      const d = new Date(c.created_at);
      return d >= dayStart && d < dayEnd;
    }).length;
    return { date: format(day, "MMM d"), likes: dayLikes, comments: dayComments };
  });

  // Calculate weekly stats
  const weeklyFollowers = followers.filter(
    (f) => new Date(f.created_at) >= sevenDaysAgo
  ).length;
  const totalLikes = likes.length;
  const totalComments = comments.length;
  const totalEngagement = totalLikes + totalComments;
  const avgEngagement = posts.length > 0 ? (totalEngagement / posts.length).toFixed(1) : "0";

  // Top performing posts
  const postEngagement = posts
    .map((post) => {
      const postLikes = likes.filter((l) => l.page_post_id === post.id).length;
      const postComments = comments.filter((c) => c.page_post_id === post.id).length;
      return {
        id: post.id,
        date: format(new Date(post.created_at), "MMM d"),
        content: post.content,
        hasImage: !!post.image_url,
        likes: postLikes,
        comments: postComments,
        total: postLikes + postComments,
        engagementRate: totalFollowers > 0 ? ((postLikes + postComments) / totalFollowers * 100).toFixed(1) : "0",
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const bestPostType = posts.reduce(
    (acc, post) => {
      const key = post.image_url ? "withImage" : "textOnly";
      const postLikes = likes.filter((l) => l.page_post_id === post.id).length;
      const postComments = comments.filter((c) => c.page_post_id === post.id).length;
      acc[key].count++;
      acc[key].engagement += postLikes + postComments;
      return acc;
    },
    { withImage: { count: 0, engagement: 0 }, textOnly: { count: 0, engagement: 0 } }
  );

  const imageAvg = bestPostType.withImage.count > 0 ? (bestPostType.withImage.engagement / bestPostType.withImage.count).toFixed(1) : "0";
  const textAvg = bestPostType.textOnly.count > 0 ? (bestPostType.textOnly.engagement / bestPostType.textOnly.count).toFixed(1) : "0";

  const customTooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--foreground))",
    fontSize: "12px",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Page Analytics</h2>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Followers" value={totalFollowers} trend={weeklyFollowers > 0 ? `+${weeklyFollowers} this week` : undefined} />
        <StatCard icon={FileText} label="Total Posts" value={posts.length} />
        <StatCard icon={ThumbsUp} label="Total Likes" value={totalLikes} />
        <StatCard icon={MessageCircle} label="Total Comments" value={totalComments} />
      </div>

      {/* Avg engagement */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Avg. Engagement per Post</span>
        </div>
        <p className="text-3xl font-bold text-primary">{avgEngagement}</p>
        <p className="text-xs text-muted-foreground">likes + comments per post</p>
      </div>

      {/* Follower Growth Chart */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Follower Growth (Last 30 Days)</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={followerGrowthData}>
              <defs>
                <linearGradient id="followerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={customTooltipStyle} />
              <Area
                type="monotone"
                dataKey="followers"
                stroke="hsl(var(--primary))"
                fill="url(#followerGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Engagement Chart */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Engagement (Last 30 Days)</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={engagementData}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={customTooltipStyle} />
              <Bar dataKey="likes" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} name="Likes" />
              <Bar dataKey="comments" stackId="a" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Comments" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-primary" /> Likes
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-accent" /> Comments
          </div>
        </div>
      </div>

      {/* Page Insights */}
      {posts.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Page Insights</h3>
          </div>

          {/* Content type comparison */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Image Posts</span>
              </div>
              <p className="text-lg font-bold text-foreground">{imageAvg}</p>
              <p className="text-[10px] text-muted-foreground">avg engagement</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Text Posts</span>
              </div>
              <p className="text-lg font-bold text-foreground">{textAvg}</p>
              <p className="text-[10px] text-muted-foreground">avg engagement</p>
            </div>
          </div>

          {/* Top performing posts */}
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Top Performing Posts</h4>
          </div>
          <div className="space-y-2.5">
            {postEngagement.map((p, i) => (
              <div key={p.id} className="flex items-start gap-3 py-3 px-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground line-clamp-2 leading-snug">{p.content}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-muted-foreground">{p.date}</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ThumbsUp className="w-3 h-3" /> {p.likes}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MessageCircle className="w-3 h-3" /> {p.comments}
                    </span>
                    {totalFollowers > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] font-medium text-primary">
                        <ArrowUpRight className="w-3 h-3" /> {p.engagementRate}%
                      </span>
                    )}
                  </div>
                </div>
                {p.hasImage && (
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PageAnalytics;
