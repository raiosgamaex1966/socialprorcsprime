import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Heart, MapPin, Globe, Phone, Mail, Edit, Trash2, Send, Image, ThumbsUp, MessageCircle, Loader2, Camera, BarChart3, Share2, Clock, CalendarIcon, Pencil, X, Check, Rocket, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AppPageShell from "@/components/AppPageShell";
import { PAGE_CATEGORIES } from "@/constants/pageCategories";

import EditPageModal from "@/components/EditPageModal";
import PagePostComments from "@/components/PagePostComments";
import PageAnalytics from "@/components/PageAnalytics";
import ShareModal from "@/components/ShareModal";
import ScheduledPostsCalendar from "@/components/ScheduledPostsCalendar";
import BoostPostModal from "@/components/BoostPostModal";
import BoostPageModal from "@/components/BoostPageModal";
import PageEvents from "@/components/PageEvents";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import defaultAvatar from "@/assets/default-avatar.jpg";

const REACTIONS = [
  { type: "like", emoji: "👍", label: "Curtir" },
  { type: "love", emoji: "❤️", label: "Amei" },
  { type: "haha", emoji: "😂", label: "Haha" },
  { type: "wow", emoji: "😮", label: "Uau" },
  { type: "sad", emoji: "😢", label: "Triste" },
  { type: "angry", emoji: "😡", label: "Irado" },
];

const PagePostCard = ({
  post,
  page,
  likes,
  userLike,
  isOwner,
  onReact,
  onDelete,
}: {
  post: any;
  page: any;
  likes: any[];
  userLike: any | null;
  isOwner: boolean;
  onReact: (reactionType: string) => void;
  onDelete: () => void;
}) => {
  const [showComments, setShowComments] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const reactionTimeoutRef = useRef<any>(null);

  const handleMouseEnterReactions = () => {
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    setShowReactions(true);
  };

  const handleMouseLeaveReactions = () => {
    reactionTimeoutRef.current = setTimeout(() => {
      setShowReactions(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    };
  }, []);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);

  const { data: commentCount = 0 } = useQuery({
    queryKey: ["page-post-comment-count", post.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("page_post_comments")
        .select("*", { count: "exact", head: true })
        .eq("page_post_id", post.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const likeCount = likes.length;
  const reactionCounts = REACTIONS.map((r) => ({
    ...r,
    count: likes.filter((l: any) => l.reaction_type === r.type).length,
  })).filter((r) => r.count > 0);

  const currentReaction = userLike
    ? REACTIONS.find((r) => r.type === userLike.reaction_type)
    : null;

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
            {page.avatar_url ? (
              <img src={page.avatar_url} alt={page.name} className="w-full h-full object-cover" />
            ) : (
              <Flag className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{page.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
          {isOwner && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowBoostModal(true)}
                className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                title="Impulsionar publicação"
              >
                <Rocket className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
      </div>

      {post.image_url && (
        <img src={post.image_url} alt="" className="w-full max-h-[400px] object-cover" />
      )}

      {/* Reaction summary */}
      {likeCount > 0 && (
        <div className="px-4 py-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <span className="flex -space-x-0.5">
            {reactionCounts.slice(0, 3).map((r) => (
              <span key={r.type} className="text-sm">{r.emoji}</span>
            ))}
          </span>
          <span className="ml-1">{likeCount}</span>
        </div>
      )}

      <div className="px-4 py-2 border-t border-border flex items-center gap-4">
        <div
          className="relative flex-1"
          onMouseEnter={handleMouseEnterReactions}
          onMouseLeave={handleMouseLeaveReactions}
        >
          <button
            onClick={() => onReact(currentReaction ? currentReaction.type : "like")}
            className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              currentReaction ? "text-primary" : "text-muted-foreground hover:text-primary"
            }`}
          >
            {currentReaction ? (
              <>
                <span className="text-lg">{currentReaction.emoji}</span>
                <span className="font-semibold">{currentReaction.label}</span>
              </>
            ) : (
              <>
                <ThumbsUp className="w-4 h-4" />
                Curtir
              </>
            )}
          </button>

          {showReactions && (
            <div 
              onMouseEnter={handleMouseEnterReactions}
              onMouseLeave={handleMouseLeaveReactions}
              className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-full shadow-lg px-2 py-1.5 flex items-center gap-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  onClick={(e) => { e.stopPropagation(); onReact(r.type); setShowReactions(false); }}
                  className={`text-2xl hover:scale-125 transition-transform px-1 ${
                    userLike?.reaction_type === r.type ? "scale-125" : ""
                  }`}
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {commentCount > 0 ? `${commentCount} ${commentCount !== 1 ? "Comentários" : "Comentário"}` : "Comentar"}
        </button>
        <button
          onClick={() => setShowShareModal(true)}
          className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Compartilhar
        </button>
      </div>

      {showComments && <PagePostComments pagePostId={post.id} />}

      {showShareModal && (
        <ShareModal
          postId={post.id}
          authorLabel={page.name}
          postContent={post.content}
          title="Compartilhar Publicação da Página"
          shareType="page_post"
          shareUrl={`/pages/${page.slug}`}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showBoostModal && (
        <BoostPostModal
          postId={post.id}
          postContent={post.content}
          onClose={() => setShowBoostModal(false)}
        />
      )}
    </div>
  );
};

const PageDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutText, setAboutText] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "analytics" | "schedule" | "events">("posts");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("12:00");
  const [showScheduler, setShowScheduler] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editDate, setEditDate] = useState<Date | undefined>();
  const [publishConfirmPostId, setPublishConfirmPostId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState("12:00");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showBoostPageModal, setShowBoostPageModal] = useState(false);

  // Fetch page
  const { data: page, isLoading } = useQuery({
    queryKey: ["page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!slug,
  });

  // Fetch follower count
  const { data: followerCount = 0 } = useQuery({
    queryKey: ["page-followers", page?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("page_followers")
        .select("*", { count: "exact", head: true })
        .eq("page_id", page!.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!page,
  });

  // Check if following
  const { data: isFollowing = false } = useQuery({
    queryKey: ["page-following", page?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_followers")
        .select("id")
        .eq("page_id", page!.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!page && !!user,
  });

  // Fetch page posts
  const { data: allPosts = [] } = useQuery({
    queryKey: ["page-posts", page?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_posts")
        .select("*")
        .eq("page_id", page!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!page,
  });

  // Separate published and scheduled posts
  const posts = allPosts.filter((p: any) => !p.scheduled_at);
  const scheduledPosts = allPosts.filter((p: any) => !!p.scheduled_at);

  // Fetch post like counts
  const postIds = posts.map((p: any) => p.id);
   const { data: allPagePostLikes = [] } = useQuery({
    queryKey: ["page-post-likes", postIds],
    queryFn: async () => {
      if (!postIds.length) return [];
      const { data, error } = await supabase
        .from("page_post_likes")
        .select("id, page_post_id, user_id, reaction_type")
        .in("page_post_id", postIds);
      if (error) throw error;
      return data || [];
    },
    enabled: postIds.length > 0,
  });

  // Fetch creator profile
  const { data: creatorProfile } = useQuery({
    queryKey: ["profile", page?.created_by],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", page!.created_by)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!page,
  });

  const isOwner = user?.id === page?.created_by;
  const categoryLabel = PAGE_CATEGORIES.find(c => c.value === page?.category)?.label || page?.category;

  const handleFollow = async () => {
    if (!user || !page) return;
    try {
      if (isFollowing) {
        await supabase.from("page_followers").delete().eq("page_id", page.id).eq("user_id", user.id);
        toast.success("Deixou de seguir a página");
      } else {
        await supabase.from("page_followers").insert({ page_id: page.id, user_id: user.id });
        toast.success("Agora você está seguindo esta página!");
        // Notify page owner about new follower
        if (page.created_by !== user.id) {
          await supabase.from("notifications").insert({
            user_id: page.created_by,
            actor_id: user.id,
            type: "page_follow",
            message: `começou a seguir sua página "${page.name}"`,
            reference_id: page.id,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["page-following", page.id] });
      queryClient.invalidateQueries({ queryKey: ["page-followers", page.id] });
      queryClient.invalidateQueries({ queryKey: ["my-page-follows"] });
    } catch {
      toast.error("Algo deu errado");
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !page || !postContent.trim()) return;

    setPosting(true);
    try {
      let image_url: string | null = null;
      if (postImage) {
        const ext = postImage.name.split(".").pop();
        const path = `page-posts/${page.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("page-images").upload(path, postImage);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("page-images").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }

      // Build scheduled_at if scheduling
      let scheduled_at: string | null = null;
      if (showScheduler && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(":").map(Number);
        const dt = new Date(scheduledDate);
        dt.setHours(hours, minutes, 0, 0);
        if (dt <= new Date()) {
          toast.error("O horário agendado deve ser no futuro");
          setPosting(false);
          return;
        }
        scheduled_at = dt.toISOString();
      }

      await supabase.from("page_posts").insert({
        page_id: page.id,
        content: postContent.trim(),
        image_url,
        created_by: user.id,
        scheduled_at,
      });

      setPostContent("");
      setPostImage(null);
      setPostImagePreview(null);
      setScheduledDate(undefined);
      setScheduledTime("12:00");
      setShowScheduler(false);
      queryClient.invalidateQueries({ queryKey: ["page-posts", page.id] });
      toast.success(scheduled_at ? "Publicação agendada!" : "Publicação publicada!");
    } catch {
      toast.error("Falha ao criar publicação");
    }
    setPosting(false);
  };

  const handleReactPost = async (postId: string, reactionType: string) => {
    if (!user || !page) return;
    const userLike = allPagePostLikes.find(
      (l: any) => l.page_post_id === postId && l.user_id === user.id
    );
    try {
      if (userLike && userLike.reaction_type === reactionType) {
        await supabase.from("page_post_likes").delete().eq("id", userLike.id);
      } else if (userLike) {
        await supabase.from("page_post_likes").update({ reaction_type: reactionType }).eq("id", userLike.id);
      } else {
        await supabase.from("page_post_likes").insert({ page_post_id: postId, user_id: user.id, reaction_type: reactionType });
        // Notify page owner about reaction
        if (page.created_by !== user.id) {
          const reactionLabel = reactionType === "like" ? "curtiu" : `reagiu com ${reactionType} a`;
          await supabase.from("notifications").insert({
            user_id: page.created_by,
            actor_id: user.id,
            type: "page_post_like",
            message: `${reactionLabel} uma publicação em "${page.name}"`,
            reference_id: postId,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["page-post-likes"] });
    } catch {
      toast.error("Algo deu errado");
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await supabase.from("page_posts").delete().eq("id", postId);
      queryClient.invalidateQueries({ queryKey: ["page-posts"] });
      toast.success("Publicação excluída");
    } catch {
      toast.error("Falha ao excluir publicação");
    }
  };

  const handleEditScheduledPost = async (postId: string) => {
    if (!editContent.trim() || !editDate) return;
    setSavingEdit(true);
    try {
      const [hours, minutes] = editTime.split(":").map(Number);
      const dt = new Date(editDate);
      dt.setHours(hours, minutes, 0, 0);
      if (dt <= new Date()) {
        toast.error("O horário agendado deve ser no futuro");
        setSavingEdit(false);
        return;
      }
      await supabase
        .from("page_posts")
        .update({ content: editContent.trim(), scheduled_at: dt.toISOString() })
        .eq("id", postId);
      queryClient.invalidateQueries({ queryKey: ["page-posts"] });
      setEditingPostId(null);
      toast.success("Publicação agendada atualizada");
    } catch {
      toast.error("Falha ao atualizar publicação");
    }
    setSavingEdit(false);
  };

  const startEditingPost = (post: any) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
    const d = new Date(post.scheduled_at);
    setEditDate(d);
    setEditTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
  };

  const requestPublishNow = useCallback((postId: string) => {
    setPublishConfirmPostId(postId);
  }, []);

  const confirmPublishNow = async () => {
    if (!publishConfirmPostId) return;
    try {
      await supabase
        .from("page_posts")
        .update({ scheduled_at: null })
        .eq("id", publishConfirmPostId);
      queryClient.invalidateQueries({ queryKey: ["page-posts"] });
      toast.success("Publicado agora!");
    } catch {
      toast.error("Falha ao publicar");
    }
    setPublishConfirmPostId(null);
  };

  const handleSaveAbout = async () => {
    if (!page) return;
    try {
      await supabase.from("pages").update({ about: aboutText.trim() || null }).eq("id", page.id);
      queryClient.invalidateQueries({ queryKey: ["page", slug] });
      setEditingAbout(false);
      toast.success("Seção 'Sobre' atualizada");
    } catch {
      toast.error("Falha ao atualizar");
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !page || !user) return;
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `page-covers/${page.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("page-images").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("page-images").getPublicUrl(path);
      await supabase.from("pages").update({ cover_photo_url: urlData.publicUrl }).eq("id", page.id);
      queryClient.invalidateQueries({ queryKey: ["page", slug] });
      toast.success("Foto de capa atualizada!");
    } catch {
      toast.error("Falha ao fazer upload da foto de capa");
    }
    setUploadingCover(false);
  };

  if (isLoading) {
    return (
      <AppPageShell>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppPageShell>
    );
  }

  if (!page) {
    return (
      <AppPageShell>
        <div className="py-20 text-center">
          <Flag className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h1 className="text-xl font-bold text-foreground">Página não encontrada</h1>
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell>
        {/* Cover photo */}
        <div
          className="h-48 md:h-64 bg-gradient-to-br from-primary/30 via-primary/10 to-accent/10 rounded-xl relative group -mx-0 overflow-hidden"
          style={page.cover_photo_url ? { backgroundImage: `url(${page.cover_photo_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
        >
          {isOwner && (
            <label className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/50 text-white text-xs font-medium cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
              {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              {uploadingCover ? "Enviando..." : page.cover_photo_url ? "Alterar capa" : "Adicionar foto de capa"}
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
            </label>
          )}
        </div>

        {/* Page header */}
        <div className="-mt-10 sm:-mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-4 overflow-hidden">
            <div className="w-24 h-24 rounded-xl border-4 border-card bg-secondary flex items-center justify-center overflow-hidden shadow-lg ml-[20px] flex-shrink-0">
              {page.avatar_url ? (
                <img src={page.avatar_url} alt={page.name} className="w-full h-full object-cover" />
              ) : (
                <Flag className="w-10 h-10 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <h1 className="text-2xl font-bold text-foreground truncate">{page.name}</h1>
              <p className="text-sm text-muted-foreground truncate">{categoryLabel} · {followerCount} {followerCount === 1 ? "seguidor" : "seguidores"}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isOwner && (
                <Button
                  onClick={handleFollow}
                  variant={isFollowing ? "secondary" : "default"}
                  size="sm"
                >
                  <Heart className={`w-4 h-4 ${isFollowing ? "fill-current" : ""}`} />
                  {isFollowing ? "Seguindo" : "Seguir"}
                </Button>
              )}
              {isOwner && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setShowBoostPageModal(true)}>
                    <Rocket className="w-4 h-4" /> Impulsionar Página
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)}>
                    <Edit className="w-4 h-4" /> Editar Página
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4">
          <div className="w-full">
            <div className="flex flex-wrap rounded-lg bg-secondary p-1 gap-0.5">
              <button
                onClick={() => setActiveTab("posts")}
                className={`shrink-0 whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "posts" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Publicações
              </button>
              <button
                onClick={() => setActiveTab("events")}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "events" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarIcon className="w-4 h-4" /> Eventos
              </button>
              {isOwner && (
                <>
                  <button
                    onClick={() => setActiveTab("analytics")}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                      activeTab === "analytics" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" /> Análise
                  </button>
                  <button
                    onClick={() => setActiveTab("schedule")}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                      activeTab === "schedule" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4" /> Agendados
                    {scheduledPosts.length > 0 && (
                      <span className="min-w-[20px] shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-center text-xs font-bold text-primary">
                        {scheduledPosts.length}
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === "events" ? (
          <div className="mt-6">
            <PageEvents pageId={page.id} isOwner={isOwner} />
          </div>
        ) : activeTab === "analytics" && isOwner ? (
          <div className="mt-6">
            <PageAnalytics pageId={page.id} />
          </div>
        ) : activeTab === "schedule" && isOwner ? (
          <div className="mt-6">
            <ScheduledPostsCalendar
              scheduledPosts={scheduledPosts}
              pageId={page.id}
              onPublishNow={requestPublishNow}
              onClickSlot={(date, hour) => {
                setScheduledDate(date);
                setScheduledTime(`${String(hour).padStart(2, "0")}:00`);
                setShowScheduler(true);
                setActiveTab("posts");
                toast.info(`Agendando para ${format(date, "d 'de' MMM", { locale: ptBR })} às ${hour > 12 ? hour - 12 : hour || 12}:00 ${hour >= 12 ? "PM" : "AM"} — escreva sua publicação abaixo`);
              }}
            />
          </div>
        ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left - About */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
              <h3 className="font-bold text-foreground mb-3">Sobre</h3>
              {page.description && (
                <p className="text-sm text-muted-foreground mb-3">{page.description}</p>
              )}

              {editingAbout ? (
                <div className="space-y-2">
                  <textarea
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm resize-none outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveAbout}>Salvar</Button>
                    <Button variant="secondary" size="sm" onClick={() => setEditingAbout(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <>
                  {page.about && <p className="text-sm text-foreground mb-3">{page.about}</p>}
                  {isOwner && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs"
                      onClick={() => { setAboutText(page.about || ""); setEditingAbout(true); }}
                    >
                      {page.about ? "Editar sobre" : "Adicionar informações sobre"}
                    </Button>
                  )}
                </>
              )}

              <div className="mt-3 space-y-2">
                {page.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" /> {page.location}
                  </div>
                )}
                {page.website && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    <a href={page.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{page.website}</a>
                  </div>
                )}
                {page.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" /> {page.phone}
                  </div>
                )}
                {page.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" /> {page.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right - Posts */}
          <div className="lg:col-span-2 space-y-4">
            {/* Create post (owner only) */}
            {isOwner && (
              <form onSubmit={handlePost} className="bg-card rounded-xl shadow-sm p-4 border border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                    {page.avatar_url ? (
                      <img src={page.avatar_url} alt={page.name} className="w-full h-full object-cover" />
                    ) : (
                      <Flag className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder={`Publicar como ${page.name}...`}
                    rows={2}
                    className="flex-1 bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground resize-none outline-none focus:ring-2 focus:ring-primary border border-border"
                  />
                </div>
                {postImagePreview && (
                  <div className="mt-3 relative inline-block">
                    <img src={postImagePreview} alt="Preview" className="max-h-40 rounded-lg" />
                    <button
                      type="button"
                      onClick={() => { setPostImage(null); setPostImagePreview(null); }}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {/* Schedule indicator */}
                {showScheduler && scheduledDate && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-foreground">
                      Agendado para {format(scheduledDate, "dd/MM/yyyy")} às {scheduledTime}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setShowScheduler(false); setScheduledDate(undefined); }}
                      className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1">
                    <label className="cursor-pointer p-2 rounded-lg hover:bg-secondary transition-colors">
                      <Image className="w-5 h-5 text-primary" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) { setPostImage(f); setPostImagePreview(URL.createObjectURL(f)); }
                        }}
                      />
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "p-2 rounded-lg hover:bg-secondary transition-colors",
                            showScheduler && "bg-primary/10"
                          )}
                        >
                          <Clock className="w-5 h-5 text-primary" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <div className="p-3 border-b border-border">
                          <p className="text-sm font-semibold text-foreground mb-2">Agendar publicação</p>
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              className="px-2 py-1.5 rounded-lg bg-secondary border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                        <Calendar
                          mode="single"
                          selected={scheduledDate}
                          onSelect={(date) => {
                            setScheduledDate(date);
                            setShowScheduler(!!date);
                          }}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                   <Button
                     type="submit"
                     size="sm"
                     disabled={!postContent.trim() || posting || (showScheduler && !scheduledDate)}
                   >
                     {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : showScheduler ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                     {showScheduler ? "Agendar" : "Publicar"}
                   </Button>
                </div>
              </form>
            )}

            {/* Scheduled posts (owner only) */}
            {isOwner && scheduledPosts.length > 0 && (
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Publicações Agendadas ({scheduledPosts.length})</h3>
                </div>
                <div className="divide-y divide-border">
                  {scheduledPosts.map((post: any) => (
                    <div key={post.id} className="p-4">
                      {editingPostId === post.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-3 rounded-lg bg-secondary border border-border text-sm text-foreground resize-none outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                          />
                          <div className="flex items-center gap-2 flex-wrap">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm text-foreground hover:bg-accent transition-colors"
                                >
                                  <CalendarIcon className="w-3.5 h-3.5" />
                                  {editDate ? format(editDate, "dd/MM/yyyy") : "Escolher data"}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={editDate}
                                  onSelect={setEditDate}
                                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                            <input
                              type="time"
                              value={editTime}
                              onChange={(e) => setEditTime(e.target.value)}
                              className="px-2 py-1.5 rounded-lg bg-secondary border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                             <Button variant="ghost" size="sm" onClick={() => setEditingPostId(null)}>
                               <X className="w-3.5 h-3.5" /> Cancelar
                             </Button>
                             <Button
                               size="sm"
                               onClick={() => handleEditScheduledPost(post.id)}
                               disabled={!editContent.trim() || !editDate || savingEdit}
                             >
                               {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                               Salvar
                             </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground line-clamp-2">{post.content}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(post.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => requestPublishNow(post.id)}
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                            title="Publicar agora"
                          >
                            <Rocket className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => startEditingPost(post)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Posts */}
            {posts.length === 0 && (
              <div className="bg-card rounded-xl shadow-sm p-8 text-center border border-border">
                <Flag className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">Nenhuma publicação ainda</p>
              </div>
            )}

            {posts.map((post: any) => {
              const postLikesForPost = allPagePostLikes.filter((l: any) => l.page_post_id === post.id);
              const userLike = postLikesForPost.find((l: any) => l.user_id === user?.id) || null;
              return (
                <PagePostCard
                  key={post.id}
                  post={post}
                  page={page}
                  likes={postLikesForPost}
                  userLike={userLike}
                  isOwner={isOwner}
                  onReact={(reactionType) => handleReactPost(post.id, reactionType)}
                  onDelete={() => handleDeletePost(post.id)}
                />
              );
            })}
          </div>
        </div>
        )}

      {isOwner && page && (
        <EditPageModal open={editModalOpen} onClose={() => setEditModalOpen(false)} page={page} />
      )}

      <AlertDialog open={!!publishConfirmPostId} onOpenChange={(open) => { if (!open) setPublishConfirmPostId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar esta publicação agora?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso publicará imediatamente a publicação agendada. Ela aparecerá no feed da sua página imediatamente e seus seguidores serão notificados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPublishNow}>
              Publicar Agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showBoostPageModal && page && (
        <BoostPageModal
          pageId={page.id}
          pageName={page.name}
          pageSlug={page.slug}
          pageAvatarUrl={page.avatar_url}
          onClose={() => setShowBoostPageModal(false)}
        />
      )}
    </AppPageShell>
  );
};

export default PageDetail;
