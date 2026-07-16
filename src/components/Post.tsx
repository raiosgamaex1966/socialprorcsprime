import { useState, useEffect, useRef } from "react";
import { renderLinkedContent } from "@/lib/renderLinkedContent";
import { ThumbsUp, Heart, MessageCircle, Share2, MoreHorizontal, Globe, Repeat2, Trash2, Bookmark, BookmarkCheck, Pencil, X, Clock, Users, Flag, Link2, Lock, MapPin, Star, EyeOff, Bell, BellOff, Code, Moon, UserX, AlertTriangle, ShieldAlert, ThumbsDown, Pin, MessageSquareOff, Download, History, Archive, LifeBuoy, Languages, Volume2, VolumeX, Rocket, ExternalLink, UserPlus, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { copyShareableLink } from "@/lib/deepLinks";
import ShareModal from "@/components/ShareModal";
import EmbedPostModal from "@/components/EmbedPostModal";
import BoostPostModal from "@/components/BoostPostModal";
import EditPostDateModal from "@/components/EditPostDateModal";
import EditAudienceModal from "@/components/EditAudienceModal";
import EditHistoryModal from "@/components/EditHistoryModal";
import FindSupportModal from "@/components/FindSupportModal";
import LinkPreviewCard, { extractFirstUrl } from "@/components/LinkPreviewCard";

import EditPostModal from "@/components/EditPostModal";
import GroupHoverCard from "@/components/GroupHoverCard";
import PageHoverCard from "@/components/PageHoverCard";
import UserProfileCard from "@/components/UserProfileCard";
import PostImageCarousel from "@/components/PostImageCarousel";
import ThreadedComments from "@/components/ThreadedComments";
import ImageLightbox from "@/components/ImageLightbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PostLike {
  id: string;
  post_id?: string;
  group_post_id?: string;
  page_post_id?: string;
  user_id: string;
  reaction_type: string;
}

interface SharedPostData {
  id: string;
  content: string;
  image_url?: string | null;
  user_id: string;
  created_at: string;
  profiles?: { display_name: string; avatar_url?: string | null } | null;
}

interface SharedGroupPostData {
  id: string;
  content: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  user_id: string;
  group_id: string;
  created_at: string;
  profiles?: { display_name: string; avatar_url?: string | null } | null;
  group?: { id: string; name: string; avatar_url?: string | null } | null;
}

interface SharedPagePostData {
  id: string;
  content: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  page_id: string;
  created_at: string;
  page?: { id: string; name: string; slug: string; avatar_url?: string | null } | null;
}

interface PostProps {
  id: string;
  postUserId: string;
  author: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
  content: string;
  image?: string | null;
  imageUrls?: string[];
  videoUrl?: string | null;
  commentCount: number;
  sharedPostId?: string | null;
  sharedGroupPostId?: string | null;
  sharedPagePostId?: string | null;
  memoryYearsAgo?: number;
  groupId?: string;
  groupName?: string;
  groupAvatarUrl?: string | null;
  pageId?: string;
  pageName?: string;
  pageSlug?: string;
  pageAvatarUrl?: string | null;
  privacy?: string;
  backgroundStyle?: string | null;
  location?: string | null;
  feeling?: string | null;
}

const TEXT_BACKGROUNDS: Record<string, string> = {
  "gradient-sunset": "bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 text-white",
  "gradient-ocean": "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 text-white",
  "gradient-forest": "bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 text-white",
  "gradient-night": "bg-gradient-to-br from-slate-700 via-gray-800 to-zinc-900 text-white",
  "gradient-candy": "bg-gradient-to-br from-pink-300 via-fuchsia-400 to-violet-500 text-white",
  "gradient-fire": "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 text-white",
  "gradient-aurora": "bg-gradient-to-br from-green-300 via-cyan-400 to-blue-500 text-white",
};

const Post = ({ id, postUserId, author, avatarUrl, createdAt, updatedAt, content, image, imageUrls, videoUrl, commentCount, sharedPostId, sharedGroupPostId, sharedPagePostId, memoryYearsAgo, groupId, groupName, groupAvatarUrl, pageId, pageName, pageSlug, pageAvatarUrl, privacy, backgroundStyle, location, feeling }: PostProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const postsTable = groupId ? "group_posts" : pageId ? "page_posts" : "posts";
  const likesTable = groupId ? "group_post_likes" : pageId ? "page_post_likes" : "post_likes";
  const likeFk = groupId ? "group_post_id" : pageId ? "page_post_id" : "post_id";
  const commentsTable = groupId ? "group_post_comments" : pageId ? "page_post_comments" : "comments";
  const commentFk = groupId ? "group_post_id" : pageId ? "page_post_id" : "post_id";

  const likesQueryKey = groupId ? ["group-post-likes", id] : pageId ? ["page-post-likes", id] : ["post-likes", id];
  const commentsCountQueryKey = groupId ? ["group-comment-count", id] : pageId ? ["page-comment-count", id] : ["comment-count", id];

  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [showEditDateModal, setShowEditDateModal] = useState(false);
  const [showEditAudienceModal, setShowEditAudienceModal] = useState(false);
  const [showEditHistoryModal, setShowEditHistoryModal] = useState(false);
  
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

  const [singleImageLightbox, setSingleImageLightbox] = useState(false);
  const [notifToggling, setNotifToggling] = useState(false);
  const [commentToggling, setCommentToggling] = useState(false);
  const [pinToggling, setPinToggling] = useState(false);
  const [showFindSupport, setShowFindSupport] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const isOwner = user?.id === postUserId;

  // Pin status query
  const { data: isPinned = false } = useQuery({
    queryKey: ["post-pinned", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("pinned")
        .eq("id", id)
        .maybeSingle();
      return (data as any)?.pinned ?? false;
    },
  });

  const handleTogglePin = async () => {
    if (!user || pinToggling) return;
    setPinToggling(true);
    const newVal = !isPinned;

    // If pinning, unpin any other pinned post first
    if (newVal) {
      await supabase
        .from("posts")
        .update({ pinned: false, pinned_at: null } as any)
        .eq("user_id", user.id)
        .eq("pinned", true);
    }

    const { error } = await supabase
      .from("posts")
      .update({
        pinned: newVal,
        pinned_at: newVal ? new Date().toISOString() : null,
      } as any)
      .eq("id", id);

    if (error) {
      toast.error("Falha ao atualizar fixação");
    } else {
      toast.success(newVal ? "Publicação fixada no seu perfil" : "Publicação desafixada");
      queryClient.invalidateQueries({ queryKey: ["post-pinned"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    }
    setPinToggling(false);
  };

  // Archive status query
  const { data: isArchived = false } = useQuery({
    queryKey: ["post-archived", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("archived")
        .eq("id", id)
        .maybeSingle();
      return (data as any)?.archived ?? false;
    },
  });

  const handleToggleArchive = async () => {
    if (!user) return;
    const newVal = !isArchived;
    const { error } = await supabase
      .from("posts")
      .update({ archived: newVal } as any)
      .eq("id", id);
    if (error) {
      toast.error("Falha ao atualizar status de arquivamento");
    } else {
      toast.success(newVal ? "Publicação movida para o arquivo" : "Publicação restaurada do arquivo");
      queryClient.invalidateQueries({ queryKey: ["post-archived", id] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    }
  };

  // Follow status query
  const { data: isFollowing = false } = useQuery({
    queryKey: ["following-user", postUserId, user?.id],
    queryFn: async () => {
      if (!user || isOwner) return false;
      const { data } = await supabase
        .from("creator_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("creator_id", postUserId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !isOwner,
  });

  const handleToggleFollow = async () => {
    if (!user) return;
    try {
      if (isFollowing) {
        await supabase.from("creator_follows").delete().eq("follower_id", user.id).eq("creator_id", postUserId);
        toast.success(`Deixou de seguir ${author.split(" ")[0]}`);
      } else {
        await supabase.from("creator_follows").insert({ follower_id: user.id, creator_id: postUserId });
        toast.success(`Agora seguindo ${author.split(" ")[0]}`);
      }
      queryClient.invalidateQueries({ queryKey: ["following-user", postUserId, user.id] });
    } catch {
      toast.error("Falha ao atualizar status de seguidor");
    }
  };

  // Interest signal
  const handleInterest = async (interested: boolean) => {
    if (!user) return;
    const postType = groupId ? "group_post" : pageId ? "page_post" : "post";
    try {
      // Upsert: delete existing then insert
      await supabase.from("post_interests").delete().eq("user_id", user.id).eq("post_id", id).eq("post_type", postType);
      await (supabase.from("post_interests") as any).insert({ user_id: user.id, post_id: id, post_type: postType, interested });
      toast.success(interested ? "Mostraremos mais publicações como esta" : "Mostraremos menos publicações como esta");
    } catch {
      toast.error("Falha ao salvar preferência");
    }
  };

  // Hide post
  const handleHidePost = async () => {
    if (!user) return;
    const postType = groupId ? "group_post" : pageId ? "page_post" : "post";
    try {
      await (supabase.from("hidden_posts") as any).insert({ user_id: user.id, post_id: id, post_type: postType });
      toast.success("Publicação oculta do seu feed");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["hidden-posts"] });
    } catch {
      toast.error("Falha ao ocultar publicação");
    }
  };

  // Snooze user for 30 days
  const handleSnoozeUser = async () => {
    if (!user) return;
    const snoozedUntil = new Date();
    snoozedUntil.setDate(snoozedUntil.getDate() + 30);
    try {
      await (supabase.from("snoozed_users") as any).insert({
        user_id: user.id,
        snoozed_user_id: postUserId,
        snoozed_until: snoozedUntil.toISOString(),
      });
      toast.success(`Silenciou ${author.split(" ")[0]} por 30 dias`);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["snoozed-users"] });
    } catch {
      toast.error("Falha ao silenciar usuário");
    }
  };

  // Translate post
  const handleTranslate = async () => {
    if (translatedContent) {
      setTranslatedContent(null);
      return;
    }
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-post", {
        body: { content, targetLanguage: navigator.language.split("-")[0] || "en" },
      });
      if (error) throw error;
      setTranslatedContent(data.translated);
      toast.success("Publicação traduzida");
    } catch {
      toast.error("Falha na tradução");
    } finally {
      setTranslating(false);
    }
  };

  // Download media
  const handleDownloadMedia = async () => {
    const urls: string[] = [];
    if (imageUrls?.length) urls.push(...imageUrls);
    else if (image) urls.push(image);
    if (videoUrl) urls.push(videoUrl);

    if (urls.length === 0) {
      toast.error("Nenhuma mídia para baixar");
      return;
    }

    for (const url of urls) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        const ext = url.includes("video") || videoUrl === url ? "mp4" : "jpg";
        a.download = `post-media-${id.slice(0, 8)}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      } catch {
        toast.error("Falha no download");
      }
    }
    toast.success("Download iniciado");
  };

  // Report post
  const handleReportPost = async () => {
    if (!user) return;
    try {
      await supabase.from("content_reports").insert({
        reporter_id: user.id,
        content_type: groupId ? "group_post" : pageId ? "page_post" : "post",
        content_id: id,
        reason: "inappropriate",
        description: "Reported via post menu",
      });
      toast.success("Denúncia enviada. Nós analisaremos esta publicação.");
    } catch {
      toast.error("Falha ao enviar denúncia");
    }
  };

  // Block user
  const handleBlockUser = async () => {
    if (!user) return;
    try {
      await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_id: postUserId });
      toast.success(`${author.split(" ")[0]} foi bloqueado(a)`);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
    } catch {
      toast.error("Falha ao bloquear usuário");
    }
  };

  const { data: commentsDisabled = false } = useQuery({
    queryKey: ["post-comments-disabled", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("comments_disabled")
        .eq("id", id)
        .maybeSingle();
      return (data as any)?.comments_disabled ?? false;
    },
  });

  const handleToggleCommenting = async () => {
    if (!user || commentToggling) return;
    setCommentToggling(true);
    const newVal = !commentsDisabled;
    const { error } = await supabase
      .from("posts")
      .update({ comments_disabled: newVal } as any)
      .eq("id", id);
    if (error) {
      toast.error("Falha ao atualizar configuração de comentários");
    } else {
      toast.success(newVal ? "Comentários desativados" : "Comentários ativados");
      queryClient.invalidateQueries({ queryKey: ["post-comments-disabled", id] });
    }
    setCommentToggling(false);
  };

  // Post notification subscription query
  const { data: isNotifSubscribed } = useQuery({
    queryKey: ["post-notif-sub", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("post_notification_subscriptions")
        .select("id")
        .eq("post_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const handleTogglePostNotifications = async () => {
    if (!user || notifToggling) return;
    setNotifToggling(true);
    try {
      if (isNotifSubscribed) {
        await supabase
          .from("post_notification_subscriptions")
          .delete()
          .eq("post_id", id)
          .eq("user_id", user.id);
        toast.success("Notificações desativadas para esta publicação");
      } else {
        await supabase
          .from("post_notification_subscriptions")
          .insert({ post_id: id, user_id: user.id });
        toast.success("Você receberá notificações para esta publicação");
      }
      queryClient.invalidateQueries({ queryKey: ["post-notif-sub", id, user.id] });
    } catch {
      toast.error("Falha ao atualizar preferência de notificação");
    } finally {
      setNotifToggling(false);
    }
  };

  const canEdit = isOwner;
  const wasEdited = updatedAt && updatedAt !== createdAt && new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 1000;

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      // Clean up related data first (in parallel)
      const cleanupPromises = [
        (supabase as any).from(likesTable).delete().eq(likeFk, id),
        (supabase as any).from(commentsTable).delete().eq(commentFk, id),
        supabase.from("notifications").delete().eq("reference_id", id),
      ];
      if (!groupId && !pageId) {
        cleanupPromises.push(
          supabase.from("saved_posts").delete().eq("post_id", id),
          supabase.from("post_notification_subscriptions").delete().eq("post_id", id)
        );
      }
      await Promise.all(cleanupPromises);

      const { error } = await (supabase as any).from(postsTable).delete().eq("id", id);
      if (error) throw error;
      toast.success("Publicação excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (error: any) {
      toast.error(error.message || "Falha ao excluir publicação");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Bookmark
  const { data: savedEntry } = useQuery({
    queryKey: ["saved-post", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_posts")
        .select("id")
        .eq("post_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const isSaved = !!savedEntry;

  const handleToggleSave = async () => {
    if (!user) return;
    try {
      if (isSaved) {
        await supabase.from("saved_posts").delete().eq("id", savedEntry!.id);
        toast.success("Publicação desmarcada");
      } else {
        await supabase.from("saved_posts").insert({ post_id: id, user_id: user.id });
        toast.success("Publicação salva");
      }
      queryClient.invalidateQueries({ queryKey: ["saved-post", id, user.id] });
      queryClient.invalidateQueries({ queryKey: ["saved-posts"] });
    } catch {
      toast.error("Falha ao salvar publicação");
    }
  };

  // Fetch shared/original post data
  const { data: sharedPost } = useQuery({
    queryKey: ["shared-post", sharedPostId],
    queryFn: async () => {
      if (!sharedPostId) return null;
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, image_url, user_id, created_at")
        .eq("id", sharedPostId)
        .maybeSingle();
      if (error || !data) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", data.user_id)
        .maybeSingle();
      return { ...data, profiles: profile } as SharedPostData;
    },
    enabled: !!sharedPostId,
  });

  // Fetch shared group post data
  const { data: sharedGroupPost } = useQuery({
    queryKey: ["shared-group-post", sharedGroupPostId],
    queryFn: async () => {
      if (!sharedGroupPostId) return null;
      const { data, error } = await supabase
        .from("group_posts")
        .select("id, content, image_url, image_urls, user_id, group_id, created_at")
        .eq("id", sharedGroupPostId)
        .maybeSingle();
      if (error || !data) return null;

      const [profileRes, groupRes] = await Promise.all([
        supabase.from("profiles").select("display_name, avatar_url").eq("user_id", data.user_id).maybeSingle(),
        supabase.from("groups").select("id, name, avatar_url").eq("id", data.group_id).maybeSingle(),
      ]);

      return {
        ...data,
        profiles: profileRes.data,
        group: groupRes.data,
      } as SharedGroupPostData;
    },
    enabled: !!sharedGroupPostId,
  });

  // Fetch shared page post data
  const { data: sharedPagePost } = useQuery({
    queryKey: ["shared-page-post", sharedPagePostId],
    queryFn: async () => {
      if (!sharedPagePostId) return null;
      const { data, error } = await supabase
        .from("page_posts")
        .select("id, content, image_url, image_urls, page_id, created_at")
        .eq("id", sharedPagePostId)
        .maybeSingle();
      if (error || !data) return null;

      const { data: pageData } = await supabase
        .from("pages")
        .select("id, name, slug, avatar_url")
        .eq("id", data.page_id)
        .maybeSingle();

      return {
        ...data,
        page: pageData,
      } as SharedPagePostData;
    },
    enabled: !!sharedPagePostId,
  });

  // Fetch likes
  const { data: likes } = useQuery({
    queryKey: likesQueryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(likesTable)
        .select("*")
        .eq(likeFk, id);
      if (error) throw error;
      return (data || []) as PostLike[];
    },
  });

  const userLike = likes?.find((l) => l.user_id === user?.id);
  const likeCount = likes?.length ?? 0;

  const REACTIONS = [
    { type: "like", emoji: "👍", label: "Curtir" },
    { type: "love", emoji: "❤️", label: "Amei" },
    { type: "haha", emoji: "😂", label: "Haha" },
    { type: "wow", emoji: "😮", label: "Uau" },
    { type: "sad", emoji: "😢", label: "Triste" },
    { type: "angry", emoji: "😡", label: "Irado" },
  ];

  const reactionCounts = REACTIONS.map((r) => ({
    ...r,
    count: likes?.filter((l) => l.reaction_type === r.type).length ?? 0,
  })).filter((r) => r.count > 0);

  const handleReact = async (reactionType: string) => {
    if (!user) return;
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    setShowReactions(false);
    try {
      if (userLike) {
        // Delete existing reaction first
        await (supabase as any).from(likesTable).delete().eq("id", userLike.id);
      }

      if (!userLike || userLike.reaction_type !== reactionType) {
        // Insert new reaction
        await (supabase as any).from(likesTable).insert({ [likeFk]: id, user_id: user.id, reaction_type: reactionType });
        if (postUserId !== user.id) {
          const type = groupId ? "group_post_like" : pageId ? "page_post_like" : "like";
          const message = groupId ? "reagiu à sua publicação no grupo" : pageId ? "reagiu à sua publicação na página" : "reagiu à sua publicação";
          await supabase.from("notifications").insert({
            user_id: postUserId,
            actor_id: user.id,
            type,
            reference_id: id,
            message,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: likesQueryKey });
    } catch {
      toast.error("Falha ao reagir");
    }
  };

  // Fetch comment count
  const { data: commentCountData } = useQuery({
    queryKey: commentsCountQueryKey,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from(commentsTable)
        .select("*", { count: "exact", head: true })
        .eq(commentFk, id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: false, locale: ptBR })
    .replace("menos de um minuto", "agora mesmo")
    .replace("cerca de ", "")
    .replace("mais de ", "")
    .replace("quase ", "");

  const displayCommentCount = commentCountData ?? commentCount;

  return (
    <>
    <div className="bg-card rounded-lg shadow-sm">
      {memoryYearsAgo && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Neste Dia · Há {memoryYearsAgo} {memoryYearsAgo === 1 ? 'ano' : 'anos'}
          </div>
        </div>
      )}
      {/* Group badge */}
      {groupId && groupName && (
        <div className="px-4 pt-3 pb-0">
          <GroupHoverCard groupId={groupId} groupName={groupName} groupAvatarUrl={groupAvatarUrl}>
            <div className="flex items-center gap-1.5 cursor-pointer w-fit">
              <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {groupAvatarUrl ? (
                  <img src={groupAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-3 h-3 text-primary" />
                )}
              </div>
              <span className="text-xs font-semibold text-primary hover:underline">{groupName}</span>
            </div>
          </GroupHoverCard>
        </div>
      )}
      {/* Page badge */}
      {pageId && pageName && (
        <div className="px-4 pt-3 pb-0">
          <PageHoverCard pageId={pageId} pageName={pageName} pageSlug={pageSlug || ""} pageAvatarUrl={pageAvatarUrl}>
            <div className="flex items-center gap-1.5 cursor-pointer w-fit">
              <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {pageAvatarUrl ? (
                  <img src={pageAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Flag className="w-3 h-3 text-primary" />
                )}
              </div>
              <span className="text-xs font-semibold text-primary hover:underline">{pageName}</span>
            </div>
          </PageHoverCard>
        </div>
      )}
       <div className="p-4 pb-2 flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <UserProfileCard userId={postUserId}>
            <img src={avatarUrl || defaultAvatar} alt={author} className="w-10 h-10 rounded-full object-cover cursor-pointer shrink-0" />
          </UserProfileCard>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <UserProfileCard userId={postUserId}>
                <p className="font-semibold text-[15px] text-foreground hover:underline cursor-pointer break-words">{author}</p>
              </UserProfileCard>
              {feeling && (
                <span className="text-[13px] text-muted-foreground break-words">
                  está se sentindo {feeling.split(" ")[0]}{" "}
                  <strong className="text-foreground">{feeling.split(" ").slice(1).join(" ")}</strong>
                </span>
              )}
              {location && (
                <span className="text-[13px] text-muted-foreground inline-flex items-center gap-0.5 flex-wrap min-w-0">
                  {feeling ? "em" : "está em"} <MapPin className="w-3 h-3 inline shrink-0" />
                  <strong className="text-foreground break-words">{location}</strong>
                </span>
              )}
              {sharedPostId && (
                <span className="text-[13px] text-muted-foreground flex items-center gap-1 flex-wrap">
                  <Repeat2 className="w-3.5 h-3.5 shrink-0" /> compartilhou uma publicação
                </span>
              )}
              {sharedGroupPostId && !sharedPostId && !sharedPagePostId && (
                <span className="text-[13px] text-muted-foreground flex items-center gap-1 flex-wrap">
                  <Repeat2 className="w-3.5 h-3.5 shrink-0" /> compartilhou uma publicação de grupo
                </span>
              )}
              {sharedPagePostId && !sharedPostId && !sharedGroupPostId && (
                <span className="text-[13px] text-muted-foreground flex items-center gap-1 flex-wrap">
                  <Repeat2 className="w-3.5 h-3.5 shrink-0" /> compartilhou uma publicação de página
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[13px] text-muted-foreground flex-wrap min-w-0">
              <span>{timeAgo}</span>
              <span>·</span>
              {privacy === "friends" ? <Users className="w-3 h-3 shrink-0" /> : privacy === "private" ? <Lock className="w-3 h-3 shrink-0" /> : <Globe className="w-3 h-3 shrink-0" />}
              {wasEdited && <span className="ml-1 text-muted-foreground">· editado</span>}
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition-colors shrink-0">
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
           <DropdownMenuContent
              align="end"
              className="w-80 p-0 rounded-xl shadow-lg border-border/60"
            >
            <div className="overflow-y-auto" style={{ maxHeight: 'min(450px, var(--radix-dropdown-menu-content-available-height, 70vh))' }}>
            <div className="p-2">
            {/* Interest signals */}
            {!isOwner && (
              <>
                <DropdownMenuItem
                  className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60"
                  onClick={() => handleInterest(true)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10 shrink-0">
                    <Star className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Tenho interesse</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">Mostrar mais publicações como esta</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60"
                  onClick={() => handleInterest(false)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    <ThumbsDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Não tenho interesse</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">Mostrar menos publicações como esta</p>
                  </div>
                </DropdownMenuItem>
              </>
            )}

            <div className="h-px bg-border/60 my-1.5 mx-2" />

            {/* Save */}
            {!groupId && !pageId && (
              <DropdownMenuItem className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60" onClick={handleToggleSave}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${isSaved ? 'bg-primary/10' : 'bg-muted'}`}>
                  {isSaved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4 text-foreground" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{isSaved ? "Remover dos salvos" : "Salvar publicação"}</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">{isSaved ? "Remover dos seus itens salvos" : "Adicionar aos seus itens salvos"}</p>
                </div>
              </DropdownMenuItem>
            )}

            {/* Copy link */}
            <DropdownMenuItem
              className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60"
              onClick={() => {
                const source = groupId ? "group_post" : pageId ? "page_post" : "post";
                copyShareableLink(source, id);
              }}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                <Link2 className="w-4 h-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">Copiar link</p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">Copiar URL da publicação para a área de transferência</p>
              </div>
            </DropdownMenuItem>

            {/* Embed */}
            <DropdownMenuItem
              className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60"
              onClick={() => setShowEmbedModal(true)}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                <Code className="w-4 h-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">Incorporar publicação</p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">Obter código de incorporação com visualização</p>
              </div>
            </DropdownMenuItem>

            {/* Notifications toggle */}
            <DropdownMenuItem
              className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60"
              onClick={handleTogglePostNotifications}
              disabled={notifToggling}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${isNotifSubscribed ? 'bg-primary/10' : 'bg-muted'}`}>
                {isNotifSubscribed ? <BellOff className="w-4 h-4 text-primary" /> : <Bell className="w-4 h-4 text-foreground" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{isNotifSubscribed ? "Desativar notificações" : "Ativar notificações"}</p>
                <p className="text-xs text-muted-foreground leading-tight mt-0.5">{isNotifSubscribed ? "Parar de receber notificações sobre esta publicação" : "Receber notificações sobre atividades"}</p>
              </div>
            </DropdownMenuItem>

            {/* Owner actions */}
            {canEdit && (
              <>
                <div className="h-px bg-border/60 my-1.5 mx-2" />
                <DropdownMenuItem className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60" onClick={() => setShowEditModal(true)}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    <Pencil className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Editar publicação</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">Modificar conteúdo ou imagens</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60" onClick={() => setShowBoostModal(true)}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                    <Rocket className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Impulsionar publicação</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">Alcançar mais pessoas com esta publicação</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60" onClick={handleTogglePin} disabled={pinToggling}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    <Pin className={`w-4 h-4 ${isPinned ? "text-primary" : "text-foreground"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{isPinned ? "Desafixar publicação" : "Fixar publicação"}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{isPinned ? "Remover do topo do seu perfil" : "Fixar no topo do seu perfil"}</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60" onClick={() => setShowEditAudienceModal(true)}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    <Globe className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Editar público</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">Alterar quem pode ver esta publicação</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60" onClick={handleToggleCommenting} disabled={commentToggling}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    {commentsDisabled ? <MessageCircle className="w-4 h-4 text-foreground" /> : <MessageSquareOff className="w-4 h-4 text-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{commentsDisabled ? "Ativar comentários" : "Desativar comentários"}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{commentsDisabled ? "Permitir que outros comentem novamente" : "Impedir que outros comentem"}</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60" onClick={() => setShowEditDateModal(true)}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    <Clock className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Editar data</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">Alterar a data desta publicação</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60" onClick={handleToggleArchive}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    <Archive className={`w-4 h-4 ${isArchived ? "text-primary" : "text-foreground"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{isArchived ? "Restaurar do arquivo" : "Mover para o arquivo"}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{isArchived ? "Mostrar esta publicação na sua linha do tempo novamente" : "Arquivar esta publicação da sua linha do tempo"}</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60" onClick={() => setShowEditHistoryModal(true)}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    <History className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Ver histórico de edições</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">Ver versões anteriores desta publicação</p>
                  </div>
                </DropdownMenuItem>
              </>
            )}

            {/* Non-owner actions */}
            {!isOwner && (
              <>
                <div className="h-px bg-border/60 my-1.5 mx-2" />
                <DropdownMenuItem
                  className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60"
                  onClick={handleHidePost}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    <EyeOff className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Ocultar publicação</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">Remover do seu feed</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60"
                  onClick={handleSnoozeUser}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    <Moon className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Silenciar {author.split(" ")[0]} por 30 dias</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">Parar temporariamente de ver publicações</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60"
                  onClick={handleToggleFollow}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    {isFollowing ? <UserMinus className="w-4 h-4 text-foreground" /> : <UserPlus className="w-4 h-4 text-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{isFollowing ? `Deixar de seguir ${author.split(" ")[0]}` : `Seguir ${author.split(" ")[0]}`}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{isFollowing ? "Parar de ver publicações mas continuar amigos" : "Ver as publicações deles no seu feed"}</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60"
                  onClick={handleTranslate}
                  disabled={translating}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    <Languages className={`w-4 h-4 ${translatedContent ? "text-primary" : "text-foreground"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{translating ? "Traduzindo…" : translatedContent ? "Mostrar original" : "Traduzir publicação"}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">{translatedContent ? "Ver o conteúdo original" : "Ver esta publicação no seu idioma"}</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60"
                  onClick={handleDownloadMedia}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    <Download className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Baixar mídia</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">Salvar imagens ou vídeos no dispositivo</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-accent/60"
                  onClick={() => setShowFindSupport(true)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                    <LifeBuoy className="w-4 h-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Buscar apoio</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">Obter ajuda ou entrar em contato com recursos</p>
                  </div>
                </DropdownMenuItem>

                <div className="h-px bg-border/60 my-1.5 mx-2" />

                <DropdownMenuItem
                  className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 focus:bg-amber-500/10"
                  onClick={handleReportPost}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10 shrink-0">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Denunciar publicação</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">Denunciar conteúdo inadequado</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={handleBlockUser}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Bloquear {author.split(" ")[0]}</p>
                    <p className="text-xs opacity-70 leading-tight mt-0.5">Impedir todas as interações com este usuário</p>
                  </div>
                </DropdownMenuItem>
              </>
            )}

            {/* Delete */}
            {isOwner && (
              <>
                <div className="h-px bg-border/60 my-1.5 mx-2" />
                <DropdownMenuItem
                  className="cursor-pointer gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">Excluir publicação</p>
                    <p className="text-xs opacity-70 leading-tight mt-0.5">Remover permanentemente esta publicação</p>
                  </div>
                </DropdownMenuItem>
              </>
            )}
            </div>
            </div>
           </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-4 pb-2">

        {/* Translated content banner */}
        {translatedContent && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Languages className="w-3 h-3" /> Traduzido
            </p>
            <p className="text-[15px] text-foreground whitespace-pre-wrap">{translatedContent}</p>
          </div>
        )}

        {backgroundStyle && TEXT_BACKGROUNDS[backgroundStyle] ? (
          <div className={`${TEXT_BACKGROUNDS[backgroundStyle]} rounded-xl min-h-[200px] flex items-center justify-center p-6`}>
            <p className="text-xl font-bold text-center whitespace-pre-wrap">{renderLinkedContent(translatedContent || content)}</p>
          </div>
        ) : !translatedContent ? (
          <p className="text-[15px] text-foreground whitespace-pre-wrap">{renderLinkedContent(content)}</p>
        ) : null}

        {/* Location badge */}
        {location && (
          <div className="flex items-center gap-1.5 mt-2 text-[13px] text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-destructive" />
            <span>{location}</span>
          </div>
        )}
      </div>

      {/* Link preview - auto-detected from content */}
      {(() => {
        const detectedUrl = extractFirstUrl(content);
        if (!detectedUrl || (imageUrls && imageUrls.length > 0) || image || videoUrl) return null;
        return (
          <div className="px-4 pb-2">
            <LinkPreviewCard url={detectedUrl} />
          </div>
        );
      })()}

      {/* Image carousel or single image */}
      {(imageUrls && imageUrls.length > 0) ? (
        <PostImageCarousel images={imageUrls} postId={id} postType="post" authorName={author} authorAvatar={avatarUrl} authorId={postUserId} createdAt={createdAt} />
      ) : image && !videoUrl ? (
        <div className="w-full cursor-pointer" onClick={() => setSingleImageLightbox(true)}>
          <img src={image} alt="Post" className="w-full object-cover max-h-[500px]" loading="lazy" />
        </div>
      ) : null}

      {/* Video player */}
      {videoUrl && (
        <div className="w-full bg-black">
          <video
            src={videoUrl}
            controls
            preload="metadata"
            className="w-full max-h-[500px]"
            controlsList="nodownload"
          />
        </div>
      )}

      {/* Single image lightbox */}
      {image && !imageUrls?.length && !videoUrl && (
        <ImageLightbox images={[image]} initialIndex={0} open={singleImageLightbox} onClose={() => setSingleImageLightbox(false)} postId={id} postType="post" authorName={author} authorAvatar={avatarUrl} authorId={postUserId} createdAt={createdAt} />
      )}

      {/* Shared post embed - enhanced card */}
      {sharedPost && (
        <div className="mx-4 mb-2 rounded-xl bg-secondary/40 overflow-hidden cursor-pointer hover:bg-secondary/60 transition-colors" onClick={() => window.open(`/?post=${sharedPost.id}`, "_blank")}>
          <div className="p-3 flex items-center gap-2.5">
            <img
              src={sharedPost.profiles?.avatar_url || defaultAvatar}
              alt={sharedPost.profiles?.display_name || "Usuário"}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-background"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate">
                {sharedPost.profiles?.display_name || "Usuário desconhecido"}
              </p>
              <div className="flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(sharedPost.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
          {sharedPost.content && (
            <div className="px-3 pb-2.5">
              <p className="text-[14px] text-foreground whitespace-pre-wrap line-clamp-4">{renderLinkedContent(sharedPost.content)}</p>
            </div>
          )}
          {sharedPost.image_url && (
            <div className="relative">
              <img src={sharedPost.image_url} alt="Shared post" className="w-full object-cover max-h-[280px]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
            </div>
          )}
        </div>
      )}

      {/* Shared group post embed - enhanced card */}
      {sharedGroupPost && (
        <div className="mx-4 mb-2 rounded-xl bg-secondary/40 overflow-hidden cursor-pointer hover:bg-secondary/60 transition-colors" onClick={() => window.open(`/groups/${sharedGroupPost.group_id}`, "_blank")}>
          {/* Group badge bar */}
          <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
            <GroupHoverCard
              groupId={sharedGroupPost.group_id}
              groupName={sharedGroupPost.group?.name || "Grupo"}
              groupAvatarUrl={sharedGroupPost.group?.avatar_url}
            >
              <div className="flex items-center gap-2 cursor-pointer w-fit" onClick={(e) => e.stopPropagation()}>
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-primary/20">
                  {sharedGroupPost.group?.avatar_url ? (
                    <img src={sharedGroupPost.group.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-3.5 h-3.5 text-primary" />
                  )}
                </div>
                <span className="text-xs font-semibold text-primary hover:underline">{sharedGroupPost.group?.name || "Grupo"}</span>
              </div>
            </GroupHoverCard>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          {/* Author */}
          <div className="px-3 pb-1.5 flex items-center gap-2">
            <img
              src={sharedGroupPost.profiles?.avatar_url || defaultAvatar}
              alt={sharedGroupPost.profiles?.display_name || "Usuário"}
              className="w-7 h-7 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate">
                {sharedGroupPost.profiles?.display_name || "Usuário desconhecido"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(sharedGroupPost.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>
          {sharedGroupPost.content && (
            <div className="px-3 pb-2.5">
              <p className="text-[14px] text-foreground whitespace-pre-wrap line-clamp-4">{renderLinkedContent(sharedGroupPost.content)}</p>
            </div>
          )}
          {sharedGroupPost.image_url && (
            <div className="relative">
              <img src={sharedGroupPost.image_url} alt="Shared group post" className="w-full object-cover max-h-[280px]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
            </div>
          )}
        </div>
      )}

      {/* Shared page post embed - enhanced card */}
      {sharedPagePost && (
        <div className="mx-4 mb-2 rounded-xl bg-secondary/40 overflow-hidden cursor-pointer hover:bg-secondary/60 transition-colors" onClick={() => window.open(`/pages/${sharedPagePost.page?.slug}`, "_blank")}>
          <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
            <a href={`/pages/${sharedPagePost.page?.slug}`} className="flex items-center gap-2 w-fit" onClick={(e) => e.stopPropagation()}>
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-primary/20">
                {sharedPagePost.page?.avatar_url ? (
                  <img src={sharedPagePost.page.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Flag className="w-3.5 h-3.5 text-primary" />
                )}
              </div>
              <span className="text-xs font-semibold text-primary hover:underline">{sharedPagePost.page?.name || "Página"}</span>
            </a>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="px-3 pb-1 text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(sharedPagePost.created_at), { addSuffix: true, locale: ptBR })}
          </div>
          {sharedPagePost.content && (
            <div className="px-3 pb-2.5">
              <p className="text-[14px] text-foreground whitespace-pre-wrap line-clamp-4">{renderLinkedContent(sharedPagePost.content)}</p>
            </div>
          )}
          {sharedPagePost.image_url && (
            <div className="relative">
              <img src={sharedPagePost.image_url} alt="Shared page post" className="w-full object-cover max-h-[280px]" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-2 flex items-center justify-between text-[15px] text-muted-foreground">
        <div className="flex items-center gap-1">
          {reactionCounts.length > 0 && (
            <div className="flex items-center gap-0.5">
              {reactionCounts.slice(0, 3).map((r) => (
                <span key={r.type} className="text-sm" title={r.label}>{r.emoji}</span>
              ))}
              <span className="ml-1 text-[13px]">{likeCount}</span>
            </div>
          )}
        </div>
        <button onClick={() => setShowComments(!showComments)} className="hover:underline cursor-pointer">
          {displayCommentCount} {displayCommentCount === 1 ? "comentário" : "comentários"}
        </button>
      </div>

      {/* Action buttons */}
      <div className="mx-4 border-t border-border py-1 flex items-center justify-around">
        <div className="relative flex-1">
          <button
            onClick={() => handleReact(userLike?.reaction_type === "like" ? "like" : "like")}
            onMouseEnter={handleMouseEnterReactions}
            onMouseLeave={handleMouseLeaveReactions}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-secondary transition-colors w-full justify-center ${
              userLike ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {userLike ? (
              <>
                <span className="text-lg">{REACTIONS.find((r) => r.type === userLike.reaction_type)?.emoji || "👍"}</span>
                <span className="font-semibold text-[15px]">{REACTIONS.find((r) => r.type === userLike.reaction_type)?.label || "Curtir"}</span>
              </>
            ) : (
              <>
                <ThumbsUp className="w-5 h-5" />
                <span className="font-semibold text-[15px]">Curtir</span>
              </>
            )}
          </button>
          {showReactions && (
            <div
              className="absolute bottom-full left-0 mb-1 flex items-center gap-1 bg-card rounded-full shadow-lg border border-border px-2 py-1.5 z-50"
              onMouseEnter={handleMouseEnterReactions}
              onMouseLeave={handleMouseLeaveReactions}
            >
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  onClick={(e) => { e.stopPropagation(); handleReact(r.type); }}
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
          onClick={() => !commentsDisabled && setShowComments(!showComments)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors flex-1 justify-center ${
            commentsDisabled ? "text-muted-foreground/40 cursor-not-allowed" : "text-muted-foreground hover:bg-secondary"
          }`}
          disabled={commentsDisabled && !isOwner}
          title={commentsDisabled ? "Os comentários estão desativados para esta publicação" : undefined}
        >
          {commentsDisabled ? <MessageSquareOff className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
          <span className="font-semibold text-[15px]">Comentar</span>
        </button>
        <button
          onClick={() => setShowShareDialog(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-secondary transition-colors flex-1 justify-center text-muted-foreground"
        >
          <Share2 className="w-5 h-5" />
          <span className="font-semibold text-[15px]">Compartilhar</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && !commentsDisabled && (
        <ThreadedComments postId={id} postUserId={postUserId} groupId={groupId} pageId={pageId} />
      )}
      {commentsDisabled && (
        <div className="px-4 py-3 text-center text-sm text-muted-foreground border-t border-border">
          <MessageSquareOff className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Os comentários foram desativados para esta publicação.
        </div>
      )}
    </div>

      {showShareDialog && (
        <ShareModal
          postId={id}
          authorLabel={author}
          postContent={content}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Excluir esta publicação?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Esta ação não pode ser desfeita. Os seguintes itens serão removidos permanentemente:</p>
                <ul className="text-sm space-y-1 text-muted-foreground list-disc pl-4">
                  <li>A publicação e todo o seu conteúdo</li>
                  <li>Todos os comentários e respostas</li>
                  <li>Todas as curtidas e reações</li>
                  <li>Notificações relacionadas</li>
                </ul>
                {content && (
                  <div className="rounded-lg border border-border p-3 bg-muted/30">
                    <p className="text-sm text-foreground line-clamp-2">{content}</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Post Modal */}
      <EditPostModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        postId={id}
        initialContent={content}
        initialImageUrls={imageUrls?.length ? imageUrls : image ? [image] : []}
        initialPrivacy={privacy}
        initialBackgroundStyle={backgroundStyle}
        initialLocation={location}
        initialFeeling={feeling}
        authorName={author}
        authorAvatar={avatarUrl}
      />

      {/* Embed Post Modal */}
      <EmbedPostModal
        open={showEmbedModal}
        onOpenChange={setShowEmbedModal}
        postId={id}
        postContent={content}
        authorName={author}
        avatarUrl={avatarUrl}
        imageUrl={image}
      />

      {/* Boost Post Modal */}
      {showBoostModal && (
        <BoostPostModal
          postId={id}
          postContent={content}
          onClose={() => setShowBoostModal(false)}
        />
      )}

      {/* Edit Date Modal */}
      {showEditDateModal && (
        <EditPostDateModal
          postId={id}
          currentDate={createdAt}
          onClose={() => setShowEditDateModal(false)}
        />
      )}

      {/* Edit Audience Modal */}
      {showEditAudienceModal && (
        <EditAudienceModal
          postId={id}
          currentPrivacy={privacy || "public"}
          onClose={() => setShowEditAudienceModal(false)}
        />
      )}

      {/* Edit History Modal */}
      {showEditHistoryModal && (
        <EditHistoryModal
          postId={id}
          currentContent={content}
          onClose={() => setShowEditHistoryModal(false)}
        />
      )}

      {/* Find Support Modal */}
      <FindSupportModal open={showFindSupport} onOpenChange={setShowFindSupport} />
    </>
  );
};

export default Post;
