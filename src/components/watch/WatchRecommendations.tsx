import defaultAvatar from "@/assets/default-avatar.jpg";
import { formatDistanceToNow } from "date-fns";
import { Radio, Eye } from "lucide-react";

interface WatchRecommendationsProps {
  videos: any[];
  formatCount: (n: number) => string;
  onVideoClick: (videoId: string) => void;
}

const WatchRecommendations = ({ videos, formatCount, onVideoClick }: WatchRecommendationsProps) => {
  if (videos.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground text-sm">Recommended for you</h3>
      {videos.slice(0, 8).map((video: any) => (
        <button
          key={video.id}
          onClick={() => onVideoClick(video.id)}
          className="flex gap-3 w-full text-left hover:bg-secondary/60 rounded-lg p-2 transition-colors"
        >
          <div className="relative w-40 min-w-[10rem] aspect-video rounded-lg overflow-hidden bg-muted">
            {video.thumbnail_url ? (
              <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">No thumbnail</div>
            )}
            {video.is_live && (
              <span className="absolute top-1 left-1 flex items-center gap-0.5 text-[10px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded">
                <Radio className="w-2.5 h-2.5" /> LIVE
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">{video.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{video.profile?.display_name || "User"}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {video.view_count > 0 && <><Eye className="w-3 h-3" /> {formatCount(video.view_count)} views · </>}
              {formatDistanceToNow(new Date(video.created_at), { addSuffix: true })}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default WatchRecommendations;
