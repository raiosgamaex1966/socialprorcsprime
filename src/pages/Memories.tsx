import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subYears, subDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, ChevronLeft, ChevronRight, Calendar, Image as ImageIcon, Share2 } from "lucide-react";
import { toast } from "sonner";
import Post from "@/components/Post";
import AppPageShell from "@/components/AppPageShell";

const Memories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);

  const month = selectedDate.getMonth() + 1;
  const day = selectedDate.getDate();

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ["memories-page", user?.id, month, day],
    queryFn: async () => {
      if (!user) return [];

      const results: any[] = [];
      for (let yearsAgo = 1; yearsAgo <= 10; yearsAgo++) {
        const targetDate = subYears(selectedDate, yearsAgo);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

        const { data } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", user.id)
          .gte("created_at", startOfDay.toISOString())
          .lt("created_at", endOfDay.toISOString())
          .order("created_at", { ascending: false });

        if (data && data.length > 0) {
          results.push(...data.map((p: any) => ({ ...p, yearsAgo })));
        }
      }

      if (results.length === 0) return [];

      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .eq("user_id", user.id)
        .single();

      return results.map((post: any) => ({
        ...post,
        profiles: prof,
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30,
  });

  // Group memories by year
  const groupedByYear: Record<number, any[]> = {};
  memories.forEach((m: any) => {
    if (!groupedByYear[m.yearsAgo]) groupedByYear[m.yearsAgo] = [];
    groupedByYear[m.yearsAgo].push(m);
  });

  const sortedYears = Object.keys(groupedByYear)
    .map(Number)
    .sort((a, b) => a - b);

  const goToPrevDay = () => setSelectedDate((d) => subDays(d, 1));
  const goToNextDay = () => {
    const tomorrow = addDays(selectedDate, 1);
    if (tomorrow <= new Date()) setSelectedDate(tomorrow);
  };
  const goToToday = () => setSelectedDate(new Date());

  const handleShareMemory = async (post: any, yearsAgo: number) => {
    if (!user) return;
    setSharingPostId(post.id);
    try {
      const yearLabel = yearsAgo === 1 ? "1 ano" : `${yearsAgo} anos`;
      const memoryNote = `📅 Neste Dia, há ${yearLabel}:\n\n${post.content}`;
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: memoryNote,
        image_url: post.image_url || null,
        image_urls: post.image_urls || [],
        video_url: post.video_url || null,
      });
      if (error) throw error;
      toast.success("Lembrança compartilhada no seu feed!");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (err: any) {
      toast.error(err.message || "Falha ao compartilhar lembrança");
    } finally {
      setSharingPostId(null);
    }
  };

  const isToday =
    selectedDate.getDate() === new Date().getDate() &&
    selectedDate.getMonth() === new Date().getMonth() &&
    selectedDate.getFullYear() === new Date().getFullYear();

  return (
    <AppPageShell>
        {/* Hero header */}
        <div className="rounded-xl overflow-hidden mb-6 bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Clock className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Lembranças</h1>
              <p className="text-sm text-muted-foreground">
                Relembre as publicações que você compartilhou neste dia ao longo dos anos
              </p>
            </div>
          </div>

          {/* Date navigation */}
          <div className="flex items-center justify-between bg-card/80 backdrop-blur-sm rounded-lg p-3">
            <button
              onClick={goToPrevDay}
              className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-base font-semibold text-foreground">
                {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
              </span>
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="ml-2 text-xs font-medium text-primary hover:underline"
                >
                  Voltar para hoje
                </button>
              )}
            </div>
            <button
              onClick={goToNextDay}
              disabled={isToday}
              className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card rounded-lg p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-32 mb-4" />
                <div className="h-3 bg-muted rounded w-full mb-2" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhuma lembrança para este dia</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Você não publicou nada em {format(selectedDate, "d 'de' MMMM", { locale: ptBR })} nos anos anteriores. Tente navegar por outras datas!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedYears.map((yearsAgo) => (
              <div key={yearsAgo}>
                {/* Year divider */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    Há {yearsAgo} {yearsAgo === 1 ? "ano" : "anos"}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(subYears(selectedDate, yearsAgo), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Posts for this year */}
                <div className="space-y-4">
                  {groupedByYear[yearsAgo].map((post: any) => (
                    <div key={post.id} className="relative">
                      <Post
                        id={post.id}
                        postUserId={post.user_id}
                        author={post.profiles?.display_name || "Você"}
                        avatarUrl={post.profiles?.avatar_url}
                        createdAt={post.created_at}
                        content={post.content}
                        image={post.image_url}
                        imageUrls={post.image_urls || []}
                        videoUrl={post.video_url || null}
                        commentCount={0}
                        memoryYearsAgo={yearsAgo}
                        privacy={post.privacy || "public"}
                        backgroundStyle={post.background_style || null}
                        location={post.location || null}
                        feeling={post.feeling || null}
                      />
                      <div className="flex justify-center -mt-2 pb-2">
                        <button
                          onClick={() => handleShareMemory(post, yearsAgo)}
                          disabled={sharingPostId === post.id}
                          className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md"
                        >
                          <Share2 className="w-4 h-4" />
                           {sharingPostId === post.id ? "Compartilhando..." : "Compartilhar no Feed"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
    </AppPageShell>
  );
};

export default Memories;
