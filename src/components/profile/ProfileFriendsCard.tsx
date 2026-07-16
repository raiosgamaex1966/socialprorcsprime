import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import defaultAvatar from "@/assets/default-avatar.jpg";

interface ProfileFriendsCardProps {
  profileUserId: string;
  friendCount: number;
}

const ProfileFriendsCard = ({ profileUserId, friendCount }: ProfileFriendsCardProps) => {
  const { data: friends = [] } = useQuery({
    queryKey: ["profile-friends-preview", profileUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${profileUserId},addressee_id.eq.${profileUserId}`)
        .limit(9);
      if (!data?.length) return [];
      const friendIds = data.map((f: any) =>
        f.requester_id === profileUserId ? f.addressee_id : f.requester_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", friendIds);
      return profiles || [];
    },
    enabled: !!profileUserId,
  });

  if (friends.length === 0) return null;

  return (
    <div className="bg-card rounded-xl shadow-sm p-4 border border-border/50">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-bold text-foreground">Friends</h2>
        <span className="text-primary text-[13px] font-medium hover:underline cursor-pointer">
          See all friends
        </span>
      </div>
      <p className="text-[13px] text-muted-foreground mb-3">{friendCount} {friendCount === 1 ? "friend" : "friends"}</p>
      <div className="grid grid-cols-3 gap-2">
        {friends.slice(0, 9).map((f: any) => (
          <Link
            key={f.user_id}
            to={`/profile/${f.user_id}`}
            className="block"
          >
            <div className="aspect-square rounded-lg overflow-hidden bg-secondary mb-1">
              <img
                src={f.avatar_url || defaultAvatar}
                alt={f.display_name}
                className="w-full h-full object-cover hover:brightness-90 transition-all"
              />
            </div>
            <p className="text-[12px] font-medium text-foreground truncate leading-tight">{f.display_name || "User"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ProfileFriendsCard;
