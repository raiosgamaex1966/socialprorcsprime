import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.jpg";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import StoryViewer from "./StoryViewer";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  expires_at: string;
}

interface GroupedStory {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  stories: Story[];
}

const Stories = ({ autoCreate = false }: { autoCreate?: boolean }) => {
  const { user } = useAuth();
  const { profile: currentProfile } = useCurrentProfile();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [initialGroupIndex, setInitialGroupIndex] = useState(0);

  useEffect(() => {
    if (autoCreate && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [autoCreate]);

  const { data: myFriendIds = [] } = useQuery({
    queryKey: ["my-friend-ids", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");
      if (error) throw error;
      return (data || []).map((f: any) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      ) as string[];
    },
    enabled: !!user,
  });

  const allowedUserIds = user ? [user.id, ...myFriendIds] : [];

  const { data: groupedStories } = useQuery({
    queryKey: ["stories", allowedUserIds],
    queryFn: async () => {
      if (allowedUserIds.length === 0) return [];
      const { data, error } = await supabase
        .from("stories")
        .select("*")
        .in("user_id", allowedUserIds)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const stories = data as Story[];
      const userIds = [...new Set(stories.map((s) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const grouped = new Map<string, GroupedStory>();
      stories.forEach((s) => {
        if (!grouped.has(s.user_id)) {
          const profile = profileMap.get(s.user_id);
          grouped.set(s.user_id, {
            user_id: s.user_id,
            display_name: profile?.display_name || "Usuário",
            avatar_url: profile?.avatar_url || null,
            stories: [],
          });
        }
        grouped.get(s.user_id)!.stories.push(s);
      });

      const result = Array.from(grouped.values());
      if (user) {
        const myIdx = result.findIndex((g) => g.user_id === user.id);
        if (myIdx > 0) {
          const [mine] = result.splice(myIdx, 1);
          result.unshift(mine);
        }
      }
      return result;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const myStories = groupedStories?.find((g) => g.user_id === user?.id);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Por favor, selecione uma imagem ou vídeo");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("O arquivo deve ter menos de 50MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("story-media")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("story-media").getPublicUrl(path);

      const { error: insertError } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: urlData.publicUrl,
        media_type: isVideo ? "video" : "image",
      });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast.success("Story publicado!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao publicar story");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openViewer = (groupIndex: number) => {
    setInitialGroupIndex(groupIndex);
    setViewerOpen(true);
  };

  return (
    <>
      <div className="bg-card rounded-lg shadow-sm p-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hidden">
          {/* Create story card */}
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="relative flex-shrink-0 w-[112px] h-[200px] rounded-xl overflow-hidden cursor-pointer group"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-foreground/60 z-[1]" />
            <img
              src={currentProfile?.avatar_url || myStories?.avatar_url || defaultAvatar}
              alt="Seu story"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-card pt-7 pb-2 text-center rounded-b-xl z-[2]">
              <p className="text-[13px] font-semibold text-foreground">
                {uploading ? "Publicando..." : "Criar story"}
              </p>
            </div>
            <div className="absolute bottom-[30px] left-1/2 -translate-x-1/2 w-9 h-9 bg-primary rounded-full flex items-center justify-center border-4 border-card z-[3] shadow-lg">
              <Plus className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Story cards with enhanced design */}
          {groupedStories?.map((group, idx) => (
            <div
              key={group.user_id}
              onClick={() => openViewer(idx)}
              className="relative flex-shrink-0 w-[112px] h-[200px] rounded-xl overflow-hidden cursor-pointer group"
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 z-[1]" />
              
              {group.stories[group.stories.length - 1].media_type === "video" ? (
                <video
                  src={group.stories[group.stories.length - 1].media_url}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  muted
                />
              ) : (
                <img
                  src={group.stories[group.stories.length - 1].media_url}
                  alt={group.display_name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
              )}
              
              {/* Avatar with gradient ring */}
              <div className="absolute top-3 left-3 z-[2]">
                <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-primary via-accent to-primary">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-card">
                    <img
                      src={group.avatar_url || defaultAvatar}
                      alt={group.display_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

              {/* Story count badge */}
              {group.stories.length > 1 && (
                <div className="absolute top-3 right-3 z-[2] bg-primary/90 text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {group.stories.length}
                </div>
              )}

              <p className="absolute bottom-3 left-3 right-3 text-[13px] font-semibold text-white truncate z-[2] drop-shadow-lg">
                {group.user_id === user?.id ? "Seu story" : group.display_name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Story viewer */}
      {viewerOpen && groupedStories && (
        <StoryViewer
          groups={groupedStories}
          initialGroupIndex={initialGroupIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
};

export default Stories;
