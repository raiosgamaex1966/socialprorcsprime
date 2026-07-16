import { useState, useRef, useCallback, useEffect } from "react";
import {
  Image, Smile, Video, X, GripVertical, Film, MapPin,
  Globe, Users, Lock, ChevronDown, Palette, Hash, Link2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import defaultAvatar from "@/assets/default-avatar.jpg";
import GifPicker from "@/components/GifPicker";
import PostCheckInPicker from "@/components/PostCheckInPicker";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import LinkPreviewCard, { extractFirstUrl, useLinkPreview } from "@/components/LinkPreviewCard";

const EMOJI_CATEGORIES = [
  {
    label: "Expressões",
    emojis: ["😀","😂","🥹","😍","🤩","😎","🥳","😭","😤","🤔","😴","🤗","😈","🫠","🥰","😜","🤯","😱","🫡","🙃"],
  },
  {
    label: "Gestos",
    emojis: ["👍","👎","👏","🙌","🤝","✌️","🤞","💪","🫶","👋","🙏","🤙","👀","🫣","🤷","💅","🖤","❤️","🔥","⭐"],
  },
  {
    label: "Atividades",
    emojis: ["🎉","🎊","🎈","🏆","⚽","🏀","🎮","🎬","🎵","🎸","📚","✈️","🏖️","🍕","🍔","☕","🍺","🎂","🌈","🚀"],
  },
  {
    label: "Feelings",
    emojis: ["😊 feliz","😢 triste","😡 irritado","😨 com medo","🥱 entediado","😍 amado","🤒 doente","😴 com sono","🥳 comemorando","🤔 pensando","😎 confiante","🥺 esperançoso","😤 frustrado","🫣 envergonhado","😌 relaxado"],
  },
];

const FEELINGS = EMOJI_CATEGORIES[3].emojis.map((f) => {
  const [emoji, ...rest] = f.split(" ");
  return { emoji, label: rest.join(" ") };
});
const QUICK_EMOJIS = EMOJI_CATEGORIES.slice(0, 3);

const TEXT_BACKGROUNDS = [
  { id: "none", label: "Nenhum", style: "" },
  { id: "gradient-sunset", label: "Pôr do sol", style: "bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 text-white" },
  { id: "gradient-ocean", label: "Oceano", style: "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 text-white" },
  { id: "gradient-forest", label: "Floresta", style: "bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 text-white" },
  { id: "gradient-night", label: "Noite", style: "bg-gradient-to-br from-slate-700 via-gray-800 to-zinc-900 text-white" },
  { id: "gradient-candy", label: "Doce", style: "bg-gradient-to-br from-pink-300 via-fuchsia-400 to-violet-500 text-white" },
  { id: "gradient-fire", label: "Fogo", style: "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 text-white" },
  { id: "gradient-aurora", label: "Aurora", style: "bg-gradient-to-br from-green-300 via-cyan-400 to-blue-500 text-white" },
];

const PRIVACY_OPTIONS = [
  { id: "public", label: "Público", icon: Globe, desc: "Qualquer pessoa pode ver" },
  { id: "friends", label: "Amigos", icon: Users, desc: "Apenas seus amigos" },
  { id: "private", label: "Somente eu", icon: Lock, desc: "Apenas visível para você" },
];

interface CreatePostProps {
  onPostCreated: () => void;
}

const MAX_IMAGES = 10;
const MAX_VIDEO_SIZE_MB = 50;

const CreatePost = ({ onPostCreated, autoOpen = false }: CreatePostProps & { autoOpen?: boolean }) => {
  const { user } = useAuth();
  const { profile } = useCurrentProfile();
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [content, setContent] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTab, setEmojiTab] = useState<"emoji" | "feeling">("emoji");
  const [selectedFeeling, setSelectedFeeling] = useState<{ emoji: string; label: string } | null>(null);
  const [location, setLocation] = useState("");
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [selectedBg, setSelectedBg] = useState(TEXT_BACKGROUNDS[0]);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [privacy, setPrivacy] = useState(PRIVACY_OPTIONS[0]);
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [hashtags, setHashtags] = useState("");
  const [showHashtags, setShowHashtags] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const privacyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect URL in content for preview
  const autoDetectedUrl = extractFirstUrl(content);
  const effectiveLinkUrl = linkUrl.trim() || autoDetectedUrl;
  const { preview: linkPreview } = useLinkPreview(effectiveLinkUrl);

  const hasMedia = imageFiles.length > 0 || !!videoFile || !!selectedGifUrl;
  const canUseBg = !hasMedia && content.length > 0 && content.length <= 200;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
      if (gifPickerRef.current && !gifPickerRef.current.contains(e.target as Node)) setShowGifPicker(false);
      if (privacyRef.current && !privacyRef.current.contains(e.target as Node)) setShowPrivacyMenu(false);
    };
    if (showEmojiPicker || showGifPicker || showPrivacyMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker, showGifPicker, showPrivacyMenu]);

  useEffect(() => {
    if (hasMedia && selectedBg.id !== "none") setSelectedBg(TEXT_BACKGROUNDS[0]);
  }, [hasMedia]);

  const handleDragStart = useCallback((idx: number) => setDragIdx(idx), []);
  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); }, []);
  const handleDrop = useCallback((e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    setImageFiles((prev) => { const next = [...prev]; const [m] = next.splice(dragIdx, 1); next.splice(dropIdx, 0, m); return next; });
    setImagePreviews((prev) => { const next = [...prev]; const [m] = next.splice(dragIdx, 1); next.splice(dropIdx, 0, m); return next; });
    setDragIdx(null); setDragOverIdx(null);
  }, [dragIdx]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - imageFiles.length;
    const selected = files.slice(0, remaining);
    for (const file of selected) { if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name} excede 5MB`); return; } }
    if (videoFile) clearVideo();
    setImageFiles((prev) => [...prev, ...selected]);
    setImagePreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) { toast.error(`O vídeo excede ${MAX_VIDEO_SIZE_MB}MB`); return; }
    if (!file.type.startsWith("video/")) { toast.error("Por favor, selecione um arquivo de vídeo"); return; }
    clearImages();
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const clearImages = () => { imagePreviews.forEach((url) => URL.revokeObjectURL(url)); setImageFiles([]); setImagePreviews([]); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const clearVideo = () => { if (videoPreview) URL.revokeObjectURL(videoPreview); setVideoFile(null); setVideoPreview(null); if (videoInputRef.current) videoInputRef.current.value = ""; };

  const clearAll = () => {
    clearImages(); clearVideo(); setSelectedGifUrl(null); setShowGifPicker(false);
    setSelectedFeeling(null); setShowEmojiPicker(false); setLocation(""); setShowLocationInput(false);
    setSelectedBg(TEXT_BACKGROUNDS[0]); setShowBgPicker(false); setHashtags(""); setShowHashtags(false);
    setPrivacy(PRIVACY_OPTIONS[0]); setLinkUrl(""); setShowLinkInput(false);
  };

  const handleSubmit = async () => {
    if (!content.trim() && imageFiles.length === 0 && !videoFile && !selectedGifUrl) return;
    if (!user) return;
    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      let videoUrl: string | null = null;
      for (const file of imageFiles) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("post-images").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(filePath);
        uploadedUrls.push(urlData.publicUrl);
      }
      if (videoFile) {
        const fileExt = videoFile.name.split(".").pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("post-videos").upload(filePath, videoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("post-videos").getPublicUrl(filePath);
        videoUrl = urlData.publicUrl;
      }

      let finalContent = content.trim();
      if (hashtags.trim()) finalContent += `\n\n${hashtags.trim()}`;

      const feelingValue = selectedFeeling ? `${selectedFeeling.emoji} ${selectedFeeling.label}` : null;
      const bgValue = selectedBg.id !== "none" && canUseBg ? selectedBg.id : null;

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: finalContent,
        image_url: selectedGifUrl || uploadedUrls[0] || null,
        image_urls: selectedGifUrl ? [selectedGifUrl] : uploadedUrls,
        video_url: videoUrl,
        privacy: privacy.id,
        background_style: bgValue,
        location: location.trim() || null,
        feeling: feelingValue,
      } as any);
      if (error) throw error;

      setContent(""); clearAll(); setIsOpen(false);
      toast.success("Publicação criada!");
      onPostCreated();
    } catch (error: any) {
      toast.error(error.message || "Falha ao criar publicação");
    } finally {
      setLoading(false);
    }
  };

  const PrivacyIcon = privacy.icon;
  const canPost = content.trim() || imageFiles.length > 0 || !!videoFile || !!selectedGifUrl || linkUrl.trim();
  const activeBadges = [selectedFeeling, location, hashtags.trim(), linkUrl.trim()].filter(Boolean);

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      {/* Trigger bar */}
      <div className="flex items-center gap-3 p-4">
        <img
          src={profile?.avatar_url || defaultAvatar}
          alt={profile?.display_name || "Perfil"}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
        />
        <button
          onClick={() => setIsOpen(true)}
          className="flex-1 bg-muted hover:bg-muted/80 rounded-full px-4 py-2.5 text-left text-[15px] text-muted-foreground transition-colors"
        >
          No que você está pensando, {profile?.display_name?.split(" ")[0] || "hoje"}?
        </button>
      </div>

      {/* Quick action row */}
      <div className="border-t border-border/50 px-2 py-1.5">
        <div className="flex items-center">
          <button
            onClick={() => { setIsOpen(true); setTimeout(() => videoInputRef.current?.click(), 100); }}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg hover:bg-muted transition-colors flex-1 justify-center"
          >
            <Video className="w-5 h-5 text-destructive" />
            <span className="text-[13px] font-medium text-muted-foreground hidden sm:inline">Vídeo</span>
          </button>
          <div className="w-px h-5 bg-border/50" />
          <button
            onClick={() => { setIsOpen(true); setTimeout(() => fileInputRef.current?.click(), 100); }}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg hover:bg-muted transition-colors flex-1 justify-center"
          >
            <Image className="w-5 h-5 text-green-500" />
            <span className="text-[13px] font-medium text-muted-foreground hidden sm:inline">Foto</span>
          </button>
          <div className="w-px h-5 bg-border/50" />
          <button
            onClick={() => { setIsOpen(true); setShowEmojiPicker(true); setEmojiTab("feeling"); }}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg hover:bg-muted transition-colors flex-1 justify-center"
          >
            <Smile className="w-5 h-5 text-amber-400" />
            <span className="text-[13px] font-medium text-muted-foreground hidden sm:inline">Sentimento</span>
          </button>
          <div className="w-px h-5 bg-border/50" />
          <button
            onClick={() => { setIsOpen(true); setShowLocationInput(true); }}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg hover:bg-muted transition-colors flex-1 justify-center"
          >
            <MapPin className="w-5 h-5 text-red-400" />
            <span className="text-[13px] font-medium text-muted-foreground hidden sm:inline whitespace-nowrap">Check-in</span>
          </button>
          <div className="w-px h-5 bg-border/50" />
          <button
            onClick={() => { setIsOpen(true); setShowLinkInput(true); }}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg hover:bg-muted transition-colors flex-1 justify-center"
          >
            <Link2 className="w-5 h-5 text-blue-500" />
            <span className="text-[13px] font-medium text-muted-foreground hidden sm:inline">Link</span>
          </button>
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 px-4 animate-in fade-in duration-150">
          <div
            className="bg-card rounded-xl w-full max-w-[540px] shadow-2xl border border-border/40 flex flex-col animate-in zoom-in-95 duration-200"
            style={{ maxHeight: "min(90vh, 720px)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 flex-shrink-0">
              <h2 className="text-[17px] font-bold text-foreground tracking-tight">Criar Publicação</h2>
              <div className="flex-1" />
              <button
                onClick={() => { setIsOpen(false); clearAll(); setContent(""); }}
                className="w-9 h-9 rounded-full bg-muted hover:bg-accent flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* User info + privacy */}
              <div className="flex items-center gap-3 px-5 pt-4 pb-1">
                <img
                  src={profile?.avatar_url || defaultAvatar}
                  alt={profile?.display_name || "Perfil"}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">
                    {profile?.display_name || "Usuário"}
                  </p>
                  <div className="relative" ref={privacyRef}>
                    <button
                      onClick={() => setShowPrivacyMenu((v) => !v)}
                      className="flex items-center gap-1 mt-1 px-2 py-[3px] rounded-md bg-muted hover:bg-accent text-xs font-medium text-muted-foreground transition-colors"
                    >
                      <PrivacyIcon className="w-3 h-3" />
                      {privacy.label}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {showPrivacyMenu && (
                      <div className="absolute left-0 top-full mt-1 w-56 bg-card border border-border/50 rounded-lg shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        {PRIVACY_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => { setPrivacy(opt); setShowPrivacyMenu(false); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                                privacy.id === opt.id ? "bg-primary/8 text-primary" : "hover:bg-muted text-foreground"
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                privacy.id === opt.id ? "bg-primary/10" : "bg-muted"
                              }`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{opt.label}</p>
                                <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Active badges row */}
              {activeBadges.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 px-5 pt-2">
                  {selectedFeeling && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                      <span>{selectedFeeling.emoji}</span>
                      <span className="capitalize">{selectedFeeling.label}</span>
                      <button onClick={() => setSelectedFeeling(null)} className="hover:text-foreground ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {location && !showLocationInput && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full text-xs font-medium">
                      <MapPin className="w-3 h-3" />
                      <span className="max-w-[140px] truncate">{location}</span>
                      <button onClick={() => setLocation("")} className="hover:text-foreground ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {hashtags.trim() && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      <Hash className="w-3 h-3" />
                      <span className="max-w-[140px] truncate">{hashtags.trim().split(" ")[0]}</span>
                      {hashtags.trim().split(" ").length > 1 && (
                        <span>+{hashtags.trim().split(" ").length - 1}</span>
                      )}
                      <button onClick={() => { setHashtags(""); setShowHashtags(false); }} className="hover:text-foreground ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* Content area */}
              <div className="px-5 pb-2 pt-2">
                {/* Textarea with optional background */}
                <div className={`rounded-xl transition-all ${
                  selectedBg.id !== "none" && canUseBg
                    ? `${selectedBg.style} min-h-[180px] flex items-center justify-center p-6`
                    : ""
                }`}>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="No que você está pensando?"
                    className={`w-full bg-transparent resize-none outline-none ${
                      selectedBg.id !== "none" && canUseBg
                        ? "text-center text-xl font-semibold placeholder:text-white/40 min-h-[80px]"
                        : "text-foreground text-[15px] placeholder:text-muted-foreground/70 min-h-[120px] leading-relaxed"
                    }`}
                    maxLength={2000}
                    autoFocus
                  />
                </div>
 
                {/* Background picker */}
                {!hasMedia && (
                  <div className="flex items-center gap-1.5 mt-1 pb-1">
                    <button
                      onClick={() => setShowBgPicker((v) => !v)}
                      className={`w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-purple-500 flex items-center justify-center transition-all ${
                        showBgPicker ? "ring-2 ring-primary ring-offset-1 ring-offset-card scale-110" : "hover:scale-110"
                      }`}
                      title="Fundo do texto"
                    >
                      <Palette className="w-3.5 h-3.5 text-white" />
                    </button>
                    {showBgPicker && (
                      <div className="flex items-center gap-1 animate-in slide-in-from-left-2 duration-150">
                        {TEXT_BACKGROUNDS.map((bg) => (
                          <button
                            key={bg.id}
                            onClick={() => { setSelectedBg(bg); }}
                            className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${
                              bg.id === "none" ? "bg-card border-border" : `${bg.style} border-transparent`
                            } ${selectedBg.id === bg.id ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""}`}
                            title={bg.label}
                          >
                            {bg.id === "none" && <X className="w-3 h-3 text-muted-foreground mx-auto" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Location check-in picker */}
                {showLocationInput && (
                  <PostCheckInPicker
                    location={location}
                    onLocationChange={setLocation}
                    onClose={() => setShowLocationInput(false)}
                  />
                )}

                {/* Hashtags input */}
                {showHashtags && (
                  <div className="mt-2 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2.5 border border-border/30">
                    <Hash className="w-4 h-4 text-primary flex-shrink-0" />
                    <input
                      type="text"
                      value={hashtags}
                      onChange={(e) => setHashtags(e.target.value)}
                      placeholder="#hashtag1 #hashtag2"
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                      autoFocus
                    />
                    <button onClick={() => { setShowHashtags(false); setHashtags(""); }} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Link URL input */}
                {showLinkInput && (
                  <div className="mt-2 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2.5 border border-border/30">
                    <Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                      autoFocus
                    />
                    <button onClick={() => { setShowLinkInput(false); setLinkUrl(""); }} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Link preview */}
                {effectiveLinkUrl && linkPreview && (
                  <div className="mt-3">
                    <LinkPreviewCard
                      url={effectiveLinkUrl}
                      removable
                      onRemove={() => { setLinkUrl(""); setShowLinkInput(false); }}
                    />
                  </div>
                )}

                {/* Image previews */}
                {imagePreviews.length > 0 && (
                  <div className="relative mt-3 rounded-lg overflow-hidden border border-border/30 bg-muted/30 p-1.5">
                    {imagePreviews.length > 1 && (
                      <p className="text-[11px] text-muted-foreground mb-1 text-center flex items-center justify-center gap-1">
                        <GripVertical className="w-3 h-3" /> Arraste para reordenar
                      </p>
                    )}
                    <div className={`grid gap-1 ${imagePreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${imagePreviews.length > 4 ? 'max-h-[240px] overflow-y-auto' : ''}`}>
                      {imagePreviews.map((preview, idx) => (
                        <div
                          key={`${preview}-${idx}`}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={(e) => handleDrop(e, idx)}
                          onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                          className={`relative group cursor-grab active:cursor-grabbing rounded-md overflow-hidden transition-all ${
                            dragIdx === idx ? 'opacity-40 scale-95' : ''
                          } ${dragOverIdx === idx && dragIdx !== idx ? 'ring-2 ring-primary' : ''}`}
                        >
                          <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-[130px] object-cover pointer-events-none" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-3 h-3 text-white" />
                          </div>
                          <button
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5 text-center">{imageFiles.length}/{MAX_IMAGES} imagens</p>
                  </div>
                )}

                {/* Video preview */}
                {videoPreview && (
                  <div className="relative mt-3 rounded-lg overflow-hidden border border-border/30 bg-muted/30 p-1.5">
                    <video src={videoPreview} controls className="w-full max-h-[240px] rounded-md bg-black" />
                    <button
                      onClick={clearVideo}
                      className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                    <p className="text-[11px] text-muted-foreground mt-1 text-center">
                      {videoFile?.name} ({(videoFile!.size / (1024 * 1024)).toFixed(1)}MB)
                    </p>
                  </div>
                )}

                {/* GIF preview */}
                {selectedGifUrl && (
                  <div className="relative mt-3 rounded-lg overflow-hidden border border-border/30 bg-muted/30 p-1.5">
                    <img src={selectedGifUrl} alt="Selected GIF" className="w-full max-h-[200px] object-contain rounded-md" />
                    <button
                      onClick={() => setSelectedGifUrl(null)}
                      className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer — pinned at bottom */}
            <div className="flex-shrink-0 px-5 pb-4 pt-2 space-y-2.5 border-t border-border/30">
              {/* Add to post toolbar */}
              <div className="flex items-center justify-between border border-border/50 rounded-lg px-2 sm:px-3 py-2 gap-1">
                <span className="text-[13px] font-semibold text-foreground whitespace-nowrap hidden sm:inline">Adicionar à sua publicação</span>
                <div className="flex gap-0.5">
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                  <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoSelect} className="hidden" />

                  <ToolbarButton
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageFiles.length >= MAX_IMAGES || !!videoFile}
                    title="Fotos"
                    active={imageFiles.length > 0}
                  >
                    <Image className="w-5 h-5 text-green-500" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => videoInputRef.current?.click()}
                    disabled={!!videoFile || imageFiles.length > 0}
                    title="Vídeo"
                    active={!!videoFile}
                  >
                    <Film className="w-5 h-5 text-destructive" />
                  </ToolbarButton>

                  <div className="relative" ref={gifPickerRef}>
                    <ToolbarButton
                      onClick={() => { setShowGifPicker((v) => !v); setShowEmojiPicker(false); }}
                      disabled={!!selectedGifUrl || imageFiles.length > 0 || !!videoFile}
                      title="GIF"
                      active={!!selectedGifUrl}
                    >
                      <span className="text-[11px] font-extrabold text-primary leading-none">GIF</span>
                    </ToolbarButton>
                    {showGifPicker && (
                      <GifPicker
                        onSelect={(url) => { setSelectedGifUrl(url); setShowGifPicker(false); clearImages(); clearVideo(); }}
                        onClose={() => setShowGifPicker(false)}
                      />
                    )}
                  </div>

                  <div className="relative" ref={emojiPickerRef}>
                    <ToolbarButton
                      onClick={() => { setShowEmojiPicker((v) => !v); setShowGifPicker(false); }}
                      title="Emoji / Sentimento"
                      active={!!selectedFeeling}
                    >
                      <Smile className="w-5 h-5 text-amber-400" />
                    </ToolbarButton>
                    {showEmojiPicker && (
                      <div className="absolute bottom-10 right-0 w-[300px] bg-card border border-border/50 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <div className="flex border-b border-border/40">
                          <button
                            onClick={() => setEmojiTab("emoji")}
                            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${emojiTab === "emoji" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                          >Emojis</button>
                          <button
                            onClick={() => setEmojiTab("feeling")}
                            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${emojiTab === "feeling" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                          >Sentimentos</button>
                        </div>
                        <div className="max-h-[220px] overflow-y-auto p-2">
                          {emojiTab === "emoji" ? (
                            QUICK_EMOJIS.map((cat) => (
                              <div key={cat.label} className="mb-2">
                                <p className="text-[11px] text-muted-foreground px-1 mb-1 font-medium uppercase tracking-wider">{cat.label}</p>
                                <div className="grid grid-cols-8 gap-0.5">
                                  {cat.emojis.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => { setContent((prev) => prev + emoji); setShowEmojiPicker(false); }}
                                      className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-lg transition-colors"
                                    >{emoji}</button>
                                  ))}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="space-y-0.5">
                              {FEELINGS.map((f) => (
                                <button
                                  key={f.label}
                                  onClick={() => { setSelectedFeeling(f); setShowEmojiPicker(false); }}
                                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                                    selectedFeeling?.label === f.label ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                                  }`}
                                >
                                  <span className="text-xl">{f.emoji}</span>
                                  <span className="text-sm capitalize">{f.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <ToolbarButton
                    onClick={() => setShowLocationInput(true)}
                    title="Check-in"
                    active={!!location}
                  >
                    <MapPin className="w-5 h-5 text-red-400" />
                  </ToolbarButton>

                  <ToolbarButton
                    onClick={() => setShowHashtags(true)}
                    title="Hashtags"
                    active={!!hashtags.trim()}
                  >
                    <Hash className="w-5 h-5 text-primary" />
                  </ToolbarButton>

                  <ToolbarButton
                    onClick={() => setShowLinkInput(true)}
                    title="Link"
                    active={!!linkUrl.trim()}
                  >
                    <Link2 className="w-5 h-5 text-blue-500" />
                  </ToolbarButton>
                </div>
              </div>

              {/* Post button */}
              <button
                onClick={handleSubmit}
                disabled={loading || !canPost}
                className={`w-full py-2.5 rounded-lg font-semibold text-[15px] transition-all ${
                  canPost && !loading
                    ? "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.99]"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Publicando...
                  </span>
                ) : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* Toolbar icon button with active state indicator */
const ToolbarButton = ({
  onClick,
  disabled,
  title,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors relative ${
      disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-muted"
    } ${active ? "bg-muted" : ""}`}
    title={title}
  >
    {children}
    {active && (
      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
    )}
  </button>
);

export default CreatePost;
