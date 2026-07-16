import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Users, FileText, TrendingUp, MessageSquare, X, BarChart3 } from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface GroupAnalyticsProps {
  groupId: string;
  onClose: () => void;
}

const GroupAnalytics = ({ groupId, onClose }: GroupAnalyticsProps) => {
  const last30Days = eachDayOfInterval({
    start: subDays(new Date(), 29),
    end: new Date(),
  });

  // Fetch members with join dates
  const { data: members } = useQuery({
    queryKey: ["group-analytics-members", groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from("group_members")
        .select("joined_at, status")
        .eq("group_id", groupId)
        .eq("status", "approved");
      return data || [];
    },
  });

  // Fetch posts with dates
  const { data: posts } = useQuery({
    queryKey: ["group-analytics-posts", groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from("group_posts")
        .select("created_at")
        .eq("group_id", groupId);
      return data || [];
    },
  });

  // Fetch comments count
  const { data: comments } = useQuery({
    queryKey: ["group-analytics-comments", groupId],
    queryFn: async () => {
      const { data: postIds } = await supabase
        .from("group_posts")
        .select("id")
        .eq("group_id", groupId);
      if (!postIds?.length) return [];
      const ids = postIds.map((p: any) => p.id);
      const { data } = await supabase
        .from("group_post_comments")
        .select("created_at")
        .in("group_post_id", ids);
      return data || [];
    },
  });

  // Build member growth data (cumulative)
  const memberGrowthData = last30Days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const count = (members || []).filter(
      (m: any) => format(new Date(m.joined_at), "yyyy-MM-dd") <= dayStr
    ).length;
    return { date: format(day, "MMM dd"), members: count };
  });

  // Build post activity data (daily counts)
  const postActivityData = last30Days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const postCount = (posts || []).filter((p: any) => {
      const d = new Date(p.created_at);
      return d >= dayStart && d < dayEnd;
    }).length;

    const commentCount = (comments || []).filter((c: any) => {
      const d = new Date(c.created_at);
      return d >= dayStart && d < dayEnd;
    }).length;

    return { date: format(day, "MMM dd"), posts: postCount, comments: commentCount };
  });

  // Summary stats
  const totalMembers = members?.length || 0;
  const totalPosts = posts?.length || 0;
  const totalComments = comments?.length || 0;
  const last7DaysPosts = (posts || []).filter(
    (p: any) => new Date(p.created_at) >= subDays(new Date(), 7)
  ).length;
  const last7DaysComments = (comments || []).filter(
    (c: any) => new Date(c.created_at) >= subDays(new Date(), 7)
  ).length;
  const newMembersLast7 = (members || []).filter(
    (m: any) => new Date(m.joined_at) >= subDays(new Date(), 7)
  ).length;

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border mt-4 p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Group Analytics
        </h2>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Members</span>
          </div>
          <p className="text-xl font-bold text-foreground">{totalMembers}</p>
          <p className="text-[10px] text-muted-foreground">+{newMembersLast7} this week</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Posts</span>
          </div>
          <p className="text-xl font-bold text-foreground">{totalPosts}</p>
          <p className="text-[10px] text-muted-foreground">{last7DaysPosts} this week</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Comments</span>
          </div>
          <p className="text-xl font-bold text-foreground">{totalComments}</p>
          <p className="text-[10px] text-muted-foreground">{last7DaysComments} this week</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Engagement</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {totalPosts > 0 ? (totalComments / totalPosts).toFixed(1) : "0"}
          </p>
          <p className="text-[10px] text-muted-foreground">comments per post</p>
        </div>
      </div>

      {/* Member Growth Chart */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Member Growth (30 days)</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={memberGrowthData}>
              <defs>
                <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Area
                type="monotone"
                dataKey="members"
                stroke="hsl(var(--primary))"
                fill="url(#memberGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Post Activity Chart */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Post & Comment Activity (30 days)</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={postActivityData}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="posts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Posts" />
              <Bar dataKey="comments" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Comments" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default GroupAnalytics;
