import { useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, MessageCircle, Move, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import useNotificationPreferences from "@/hooks/useNotificationPreferences";
import defaultAvatar from "@/assets/default-avatar.jpg";
import ProfileTabBar from "@/components/profile/ProfileTabBar";
import ProfileTabContent from "@/components/profile/ProfileTabContent";
import ProfileCompletionBar from "@/components/profile/ProfileCompletionBar";
import AppPageShell from "@/components/AppPageShell";
import CoverPhotoCropModal from "@/components/profile/CoverPhotoCropModal";
import ImageLightbox from "@/components/ImageLightbox";

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const profileUserId = userId || user?.id;
  const isOwn = profileUserId === user?.id;
  const { isOnline } = useOnlinePresence();
  const { prefs, updatePref } = useNotificationPreferences();

  const [editingBio, setEditingBio] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [repositionImageSrc, setRepositionImageSrc] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [photoLightboxOpen, setPhotoLightboxOpen] = useState(false);
  const [photoLightboxImages, setPhotoLightboxImages] = useState<string[]>([]);

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["profile", profileUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", profileUserId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!profileUserId,
  });

  const { data: followerCount = 0 } = useQuery({
    queryKey: ["follower-count", profileUserId],
    queryFn: async () => {
      const { count } = await supabase
        .from("creator_follows")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", profileUserId!);
      return count || 0;
    },
    enabled: !!profileUserId,
  });

  const { data: friendCount = 0 } = useQuery({
    queryKey: ["friend-count", profileUserId],
    queryFn: async () => {
      const { count } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`requester_id.eq.${profileUserId},addressee_id.eq.${profileUserId}`);
      return count || 0;
    },
    enabled: !!profileUserId,
  });

  const { data: friendAvatars = [] } = useQuery({
    queryKey: ["friend-avatars", profileUserId],
    queryFn: async () => {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${profileUserId},addressee_id.eq.${profileUserId}`)
        .limit(8);
      if (!friendships?.length) return [];
      const friendIds = friendships.map((f: any) =>
        f.requester_id === profileUserId ? f.addressee_id : f.requester_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, avatar_url, display_name")
        .in("user_id", friendIds);
      return profiles || [];
    },
    enabled: !!profileUserId,
  });

  const uploadImage = async (file: File | Blob, type: "avatar" | "cover") => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter menos de 5MB");
      return;
    }
    const ext = file instanceof File ? file.name.split(".").pop() : "jpg";
    const path = `${user.id}/${type}-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("profile-images")
      .upload(path, file);
    if (uploadError) { toast.error(uploadError.message); return; }

    const { data: urlData } = supabase.storage
      .from("profile-images")
      .getPublicUrl(path);

    const updateField = type === "avatar" ? "avatar_url" : "cover_photo_url";
    const updates: Record<string, any> = { [updateField]: urlData.publicUrl };
    if (type === "cover") updates.cover_photo_offset_y = 50;

    const { error } = await supabase
      .from("profiles")
      .update(updates as never)
      .eq("user_id", user.id);
    if (error) { toast.error(error.message); return; }

    toast.success(`${type === "avatar" ? "Foto de perfil" : "Foto de capa"} atualizada!`);
    refetchProfile();
    queryClient.invalidateQueries({ queryKey: ["current-profile"] });
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  const handleCoverFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setCropImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (blob: Blob) => {
    setCropImageSrc(null);
    await uploadImage(blob, "cover");
  };

  const coverOffsetY = profile?.cover_photo_offset_y ?? 50;

  const handleRepositionStart = () => {
    if (profile?.cover_photo_url) {
      setRepositionImageSrc(profile.cover_photo_url);
    }
  };

  const handleRepositionCropComplete = async (blob: Blob) => {
    setRepositionImageSrc(null);
    await uploadImage(blob, "cover");
  };

  const online = profileUserId ? isOnline(profileUserId) : false;

  if (!profile) {
    return (
      <AppPageShell as="div" contentClassName="flex h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </AppPageShell>
    );
  }

  return (
    <AppPageShell as="div" contentClassName="!max-w-[680px]">
      {/* Crop Modal — new upload */}
      {cropImageSrc && (
        <CoverPhotoCropModal
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImageSrc(null)}
        />
      )}

      {/* Crop Modal — reposition existing */}
      {repositionImageSrc && (
        <CoverPhotoCropModal
          imageSrc={repositionImageSrc}
          onCropComplete={handleRepositionCropComplete}
          onCancel={() => setRepositionImageSrc(null)}
        />
      )}

      {/* Cover Photo */}
      <div
        className="relative group/cover h-[200px] sm:h-[320px] rounded-lg overflow-hidden bg-secondary"
      >
        {profile.cover_photo_url ? (
          <img
            src={profile.cover_photo_url}
            alt="Cover"
            className="w-full h-full object-cover select-none cursor-pointer"
            style={{ objectPosition: `center ${coverOffsetY}%` }}
            draggable={false}
            onClick={() => {
              if (profile.cover_photo_url) {
                setPhotoLightboxImages([profile.cover_photo_url]);
                setPhotoLightboxOpen(true);
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-muted/80 to-secondary" />
        )}

        {/* Edit buttons (not in reposition mode) */}
        {isOwn && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleCoverFileSelect(e.target.files[0])} />
            {profile.cover_photo_url && (
              <button
                onClick={handleRepositionStart}
                className="flex items-center gap-1.5 bg-card/90 backdrop-blur-sm hover:bg-card px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground shadow-md transition-colors"
              >
                <Move className="w-3.5 h-3.5" />
                Reposicionar
              </button>
            )}
            <button
              onClick={() => coverInputRef.current?.click()}
              className="flex items-center gap-1.5 bg-card/90 backdrop-blur-sm hover:bg-card px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground shadow-md transition-colors"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {profile.cover_photo_url ? "Alterar foto" : "Adicionar foto de capa"}
            </button>
          </div>
        )}
      </div>

      {/* Profile Info Bar with blur overlay */}
      <div className="px-3 sm:px-8 pb-4 -mt-[60px] sm:-mt-[68px] relative z-10">
        <div className="gap-3 sm:gap-[24px] py-[16px] flex flex-col sm:flex-row items-center sm:items-end justify-start mt-[42px] px-0">
          {/* Avatar */}
          <div className="relative group/avatar flex-shrink-0">
            <div
              className="rounded-full p-1.5 bg-card shadow-xl ring-4 ring-background cursor-pointer"
              onClick={() => {
                const img = profile.avatar_url || defaultAvatar;
                setPhotoLightboxImages([img]);
                setPhotoLightboxOpen(true);
              }}
            >
              <img
                src={profile.avatar_url || defaultAvatar}
                alt={profile.display_name}
                className="w-[80px] h-[80px] sm:w-[120px] sm:h-[120px] rounded-full object-cover"
              />
            </div>
            {online && (
              <span className="absolute bottom-3 right-3 w-4.5 h-4.5 rounded-full bg-green-500 border-[3px] border-card" />
            )}
            {isOwn && (
              <>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "avatar")} />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-secondary hover:bg-muted flex items-center justify-center shadow-lg border border-border/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                >
                  <Camera className="w-4 h-4 text-foreground" />
                </button>
              </>
            )}
          </div>

          {/* Name, stats & action */}
          <div className="flex-1 min-w-0 pb-1 text-center sm:text-left">
            <h1 className="text-lg sm:text-[28px] font-bold text-foreground leading-tight tracking-tight">{profile.display_name || "User"}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              {friendCount} {friendCount === 1 ? "amigo" : "amigos"}
              <span className="mx-1.5 text-border">·</span>
              {followerCount} {followerCount === 1 ? "seguidor" : "seguidores"}
            </p>
            {friendAvatars.length > 0 && (
              <div className="flex items-center justify-center sm:justify-start mt-2 sm:mt-2.5 -space-x-1.5">
                {friendAvatars.slice(0, 8).map((f: any) => (
                  <Link key={f.user_id} to={`/profile/${f.user_id}`}>
                    <img
                      src={f.avatar_url || defaultAvatar}
                      alt={f.display_name}
                      title={f.display_name}
                      className="w-8 h-8 rounded-full object-cover border-2 border-card hover:scale-110 transition-transform"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {!isOwn && user && (
            <div className="pb-1 flex items-center gap-2 shrink-0 sm:pb-1">
              <button
                onClick={() => navigate(`/messages?userId=${profileUserId}`)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs sm:text-sm hover:bg-primary/90 transition-colors shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Mensagem
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Facebook-style underline tab navigation */}
      <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content area - full width */}
      <div className="py-4">
        {isOwn && activeTab === "posts" && (
          <div className="mb-4">
            <ProfileCompletionBar profile={profile} onEditClick={() => setEditingBio(true)} />
          </div>
        )}
        <ProfileTabContent
          profileUserId={profileUserId!}
          isOwn={isOwn}
          activeTab={activeTab}
          profile={profile}
          editingBio={editingBio}
          setEditingBio={setEditingBio}
          prefs={prefs}
          updatePref={updatePref}
        />
      </div>

      <ImageLightbox
        images={photoLightboxImages}
        initialIndex={0}
        open={photoLightboxOpen}
        onClose={() => setPhotoLightboxOpen(false)}
      />
    </AppPageShell>
  );
};

export default Profile;
