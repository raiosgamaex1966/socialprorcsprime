import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Post from "@/components/Post";
import { Bookmark, Heart, MapPin, Grid3X3, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import AppPageShell from "@/components/AppPageShell";

const Saved = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"posts" | "listings">("posts");

  const { data: savedPosts, isLoading: loadingPosts } = useQuery({
    queryKey: ["saved-posts", user?.id],
    queryFn: async () => {
      const { data: saved, error } = await supabase
        .from("saved_posts")
        .select("post_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!saved || saved.length === 0) return [];

      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
        .eq("status", "accepted");

      const friendIds = friendships?.map((f: any) =>
        f.requester_id === user!.id ? f.addressee_id : f.requester_id
      ) || [];
      const allowedUserIds = [user!.id, ...friendIds];

      const postIds = saved.map((s) => s.post_id);
      const { data: posts } = await supabase
        .from("posts")
        .select("*")
        .in("id", postIds)
        .in("user_id", allowedUserIds);

      const userIds = [...new Set((posts || []).map((p: any) => p.user_id))];
      let profileMap = new Map();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      }

      const postMap = new Map((posts || []).map((p: any) => [p.id, p]));
      return saved
        .map((s) => {
          const post = postMap.get(s.post_id);
          if (!post) return null;
          return { ...post, profiles: profileMap.get(post.user_id) || null };
        })
        .filter(Boolean);
    },
    enabled: !!user,
  });

  const { data: savedListings, isLoading: loadingListings } = useQuery({
    queryKey: ["saved-listings"],
    queryFn: async () => {
      const { data: saved, error } = await supabase
        .from("saved_listings")
        .select("listing_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!saved || saved.length === 0) return [];

      const ids = saved.map((s) => s.listing_id);
      const { data: listings } = await supabase.from("listings").select("*").in("id", ids);

      const listingMap = new Map((listings || []).map((l: any) => [l.id, l]));
      return saved.map((s) => listingMap.get(s.listing_id)).filter(Boolean);
    },
    enabled: !!user,
  });

  const unsaveListing = async (listingId: string) => {
    if (!user) return;
    await supabase.from("saved_listings").delete().eq("user_id", user.id).eq("listing_id", listingId);
    toast.success("Removido dos salvos");
    queryClient.invalidateQueries({ queryKey: ["saved-listings"] });
    queryClient.invalidateQueries({ queryKey: ["saved-listings-set"] });
  };

  const isLoading = activeTab === "posts" ? loadingPosts : loadingListings;

  return (
    <AppPageShell contentClassName="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Salvos</h1>
          </div>

          {/* Tabs */}
          <div className="flex bg-secondary rounded-lg p-1 w-fit">
            {(["posts", "listings"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "posts" ? "Publicações" : "Classificados"}
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="text-center py-12 text-muted-foreground">Carregando…</div>
          )}

          {/* Saved Posts */}
          {activeTab === "posts" && !loadingPosts && (
            <>
              {savedPosts?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg">Nenhuma publicação salva ainda</p>
                  <p className="text-sm mt-1">Salve publicações do seu feed para encontrá-las aqui mais tarde.</p>
                </div>
              )}
              {savedPosts?.map((post: any) => (
                <Post
                  key={post.id}
                  id={post.id}
                  postUserId={post.user_id}
                  author={post.profiles?.display_name || "Usuário Desconhecido"}
                  avatarUrl={post.profiles?.avatar_url}
                  createdAt={post.created_at}
                  updatedAt={post.updated_at}
                  content={post.content}
                  image={post.image_url}
                  commentCount={0}
                  sharedPostId={post.shared_post_id}
                  privacy={post.privacy || "public"}
                  backgroundStyle={post.background_style || null}
                  location={post.location || null}
                  feeling={post.feeling || null}
                />
              ))}
            </>
          )}

          {/* Saved Listings */}
          {activeTab === "listings" && !loadingListings && (
            <>
              {savedListings?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg">Nenhum classificado salvo ainda</p>
                  <p className="text-sm mt-1">Salve classificados do marketplace para encontrá-los aqui mais tarde.</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedListings?.map((listing: any) => {
                  const thumb = listing.image_url || (listing.image_urls && listing.image_urls[0]);
                  return (
                    <div key={listing.id} className="bg-card rounded-lg shadow-sm overflow-hidden group relative">
                      <Link to={`/marketplace/${listing.id}`}>
                        <div className="h-40 bg-secondary relative">
                          {thumb ? (
                            <img src={thumb} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                          )}
                          {listing.status === "sold" && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <span className="text-white font-bold text-sm bg-black/60 px-3 py-1 rounded-full">VENDIDO</span>
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <Link to={`/marketplace/${listing.id}`} className="flex-1 min-w-0">
                            <p className="text-lg font-bold text-foreground">R$ {Number(listing.price).toLocaleString()}</p>
                            <p className="text-sm text-foreground truncate">{listing.title}</p>
                          </Link>
                          <button
                            onClick={() => unsaveListing(listing.id)}
                            className="shrink-0 w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center"
                            title="Remover dos salvos"
                          >
                            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          {listing.location && (
                            <>
                              <MapPin className="w-3 h-3" />
                              <span>{listing.location}</span>
                              <span>·</span>
                            </>
                          )}
                          <span>{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: ptBR })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
    </AppPageShell>
  );
};

export default Saved;
