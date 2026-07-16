import { useState } from "react";
import { ThumbsUp, MessageCircle, Share2, Send, Bookmark, PictureInPicture2, ListPlus, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface WatchVideoCardProps {
  video: any;
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  isSaved: boolean;
  onToggleLike: (videoId: string) => void;
  onToggleSave: (videoId: string) => void;
  onAddToPlaylist: (videoId: string) => void;
  expandedVideo: string | null;
  onToggleComments: (videoId: string) => void;
  comments: any[];
  onAddComment: (videoId: string, content: string) => void;
  onVideoPlay: (videoId: string, el: HTMLVideoElement) => void;
  formatCount: (n: number) => string;
  formatDuration: (s: number | null) => string;
}

const WatchVideoCard = ({
  video, isLiked, likeCount, commentCount, isSaved,
  onToggleLike, onToggleSave, onAddToPlaylist,
  expandedVideo, onToggleComments, comments, onAddComment,
  onVideoPlay, formatCount, formatDuration,
}: WatchVideoCardProps) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");

  const handlePiP = async (videoEl: HTMLVideoElement) => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoEl.requestPictureInPicture();
      }
    } catch {
      toast.error("Picture-in-Picture não suportado");
    }
  };

  return (
    <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
      {/* Creator info */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <img src={video.profile.avatar_url || defaultAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{video.profile.display_name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
            {video.view_count > 0 && ` · ${formatCount(video.view_count)} ${video.view_count === 1 ? 'visualização' : 'visualizações'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {video.is_live && (
            <span className="flex items-center gap-1 text-xs font-bold text-white bg-red-600 px-2 py-1 rounded-full animate-pulse">
              <Radio className="w-3 h-3" />
              AO VIVO
              {video.live_viewer_count > 0 && ` · ${formatCount(video.live_viewer_count)}`}
            </span>
          )}
          {video.category && video.category !== "general" && (
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full capitalize">{video.category}</span>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pb-2">
        <h3 className="font-semibold text-foreground">{video.title}</h3>
        {video.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{video.description}</p>}
      </div>

      {/* Video player */}
      <div className="relative bg-black aspect-video group">
        <video
          id={`watch-video-${video.id}`}
          src={video.video_url}
          className="w-full h-full object-contain"
          controls
          preload="metadata"
          poster={video.thumbnail_url || undefined}
          onPlay={(e) => onVideoPlay(video.id, e.currentTarget)}
        />
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none">
            {formatDuration(video.duration)}
          </span>
        )}
        {/* PiP button */}
        <button
          onClick={() => {
            const el = document.getElementById(`watch-video-${video.id}`) as HTMLVideoElement;
            if (el) handlePiP(el);
          }}
          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          title="Picture-in-Picture"
        >
          <PictureInPicture2 className="w-4 h-4" />
        </button>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-1 px-2 sm:px-4 py-2 border-t">
        <button
          onClick={() => onToggleLike(video.id)}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            isLiked ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <ThumbsUp className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? "fill-primary" : ""}`} />
          {likeCount ? formatCount(likeCount) : "Curtir"}
        </button>

        <button
          onClick={() => onToggleComments(video.id)}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
        >
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          {commentCount ? formatCount(commentCount) : "Comentar"}
        </button>

        <button
          onClick={() => onToggleSave(video.id)}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            isSaved ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Bookmark className={`w-4 h-4 sm:w-5 sm:h-5 ${isSaved ? "fill-primary" : ""}`} />
          {isSaved ? "Salvo" : "Salvar"}
        </button>

        <button
          onClick={() => onAddToPlaylist(video.id)}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
        >
          <ListPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          Playlist
        </button>

        <button
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/watch?v=${video.id}`);
            toast.success("Link copiado!");
          }}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors ml-auto"
        >
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          Compartilhar
        </button>
      </div>

      {/* Comments section */}
      {expandedVideo === video.id && (
        <div className="border-t px-4 py-3 space-y-3">
          <div className="flex gap-2">
            <img src={defaultAvatar} alt="" className="w-8 h-8 rounded-full object-cover mt-0.5" />
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Escreva um comentário..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && commentText.trim()) {
                    onAddComment(video.id, commentText.trim());
                    setCommentText("");
                  }
                }}
                className="flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (commentText.trim()) {
                    onAddComment(video.id, commentText.trim());
                    setCommentText("");
                  }
                }}
                disabled={!commentText.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário ainda. Seja o primeiro!</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-2">
                  <img src={comment.profile.avatar_url || defaultAvatar} alt="" className="w-8 h-8 rounded-full object-cover mt-0.5" />
                  <div className="flex-1 bg-secondary rounded-xl px-3 py-2">
                    <p className="text-sm font-semibold text-foreground">{comment.profile.display_name}</p>
                    <p className="text-sm text-foreground">{comment.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WatchVideoCard;
