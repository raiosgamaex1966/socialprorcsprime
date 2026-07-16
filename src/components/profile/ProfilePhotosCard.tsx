import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ImageLightbox from "@/components/ImageLightbox";

interface ProfilePhotosCardProps {
  profileUserId: string;
  isFriend?: boolean;
}

const ProfilePhotosCard = ({ profileUserId, isFriend = false }: ProfilePhotosCardProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data: photos = [] } = useQuery({
    queryKey: ["profile-photos-preview", profileUserId, isFriend],
    queryFn: async () => {
      if (!isFriend) return [];
      const { data } = await supabase
        .from("posts")
        .select("id, image_url, image_urls")
        .eq("user_id", profileUserId)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(9);
      return data || [];
    },
    enabled: !!profileUserId && isFriend,
  });

  if (!isFriend) return null;

  if (photos.length === 0) return null;

  const allImages = photos.map((post: any) => post.image_url || post.image_urls?.[0]).filter(Boolean);

  return (
    <div className="bg-card rounded-xl shadow-sm p-4 border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-foreground">Photos</h2>
        <span className="text-primary text-[13px] font-medium hover:underline cursor-pointer">
          See all photos
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
        {photos.slice(0, 9).map((post: any, idx: number) => {
          const imgUrl = post.image_url || post.image_urls?.[0];
          return (
            <div
              key={post.id}
              className="aspect-square bg-secondary cursor-pointer"
              onClick={() => {
                setLightboxIndex(idx);
                setLightboxOpen(true);
              }}
            >
              <img src={imgUrl} alt="" className="w-full h-full object-cover hover:brightness-90 transition-all" />
            </div>
          );
        })}
      </div>

      <ImageLightbox
        images={allImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};

export default ProfilePhotosCard;
