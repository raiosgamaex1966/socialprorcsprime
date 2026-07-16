import { useState, useRef, useCallback, useEffect } from "react";
import {
  Image as ImageIcon, Smile, X, GripVertical, MapPin,
  Globe, Users, Lock, ChevronDown, Palette, Hash
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import defaultAvatar from "@/assets/default-avatar.jpg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const EMOJI_CATEGORIES = [
  {
    label: "Smileys",
    emojis: ["😀","😂","🥹","😍","🤩","😎","🥳","😭","😤","🤔","😴","🤗","😈","🫠","🥰","😜","🤯","😱","🫡","🙃"],
  },
  {
    label: "Gestures",
    emojis: ["👍","👎","👏","🙌","🤝","✌️","🤞","💪","🫶","👋","🙏","🤙","👀","🫣","🤷","💅","🖤","❤️","🔥","⭐"],
  },
  {
    label: "Activities",
    emojis: ["🎉","🎊","🎈","🏆","⚽","🏀","🎮","🎬","🎵","🎸","📚","✈️","🏖️","🍕","🍔","☕","🍺","🎂","🌈","🚀"],
  },
  {
    label: "Feelings",
    emojis: ["😊 feliz","😢 triste","😡 bravo(a)","😨 assustado(a)","🥱 entediado(a)","😍 amado(a)","🤒 doente","😴 sonolento(a)","🥳 comemorando","🤔 pensando","😎 confiante","🥺 esperançoso(a)","😤 frustrado(a)","🫣 envergonhado(a)","😌 relaxado(a)"],
  },
];

const FEELINGS = EMOJI_CATEGORIES[3].emojis.map((f) => {
  const [emoji, ...rest] = f.split(" ");
  return { emoji, label: rest.join(" ") };
});

const TEXT_BACKGROUNDS = [
  { id: "none", label: "Nenhum", style: "" },
  { id: "gradient-sunset", label: "Pôr do Sol", style: "bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 text-white" },
  { id: "gradient-ocean", label: "Oceano", style: "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 text-white" },
  { id: "gradient-forest", label: "Floresta", style: "bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 text-white" },
  { id: "gradient-night", label: "Noite", style: "bg-gradient-to-br from-slate-700 via-gray-800 to-zinc-900 text-white" },
  { id: "gradient-candy", label: "Doce", style: "bg-gradient-to-br from-pink-300 via-fuchsia-400 to-violet-500 text-white" },
  { id: "gradient-fire", label: "Fogo", style: "bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 text-white" },
  { id: "gradient-aurora", label: "Aurora", style: "bg-gradient-to-br from-green-300 via-cyan-400 to-blue-500 text-white" },
];

const PRIVACY_OPTIONS = [
  { id: "public", label: "Público", icon: Globe, desc: "Qualquer pessoa pode ver esta publicação" },
  { id: "friends", label: "Amigos", icon: Users, desc: "Apenas seus amigos" },
  { id: "private", label: "Somente eu", icon: Lock, desc: "Apenas visível para você" },
];

const MAX_IMAGES = 10;

interface EditPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  initialContent: string;
  initialImageUrls: string[];
  initialPrivacy?: string;
  initialBackgroundStyle?: string | null;
  initialLocation?: string | null;
  initialFeeling?: string | null;
  authorName: string;
  authorAvatar?: string | null;
}

const EditPostModal = ({
  open,
  onOpenChange,
  postId,
  initialContent,
  initialImageUrls,
  initialPrivacy = "public",
  initialBackgroundStyle,
  initialLocation,
  initialFeeling,
  authorName,
  authorAvatar,
}: EditPostModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [content, setContent] = useState(initialContent);
  const [existingUrls, setExistingUrls] = useState<string[]>(initialImageUrls);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Feature states
  const [privacy, setPrivacy] = useState(PRIVACY_OPTIONS.find(p => p.id === initialPrivacy) || PRIVACY_OPTIONS[0]);
  const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
  const [selectedBg, setSelectedBg] = useState(TEXT_BACKGROUNDS.find(b => b.id === (initialBackgroundStyle || "none")) || TEXT_BACKGROUNDS[0]);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [location, setLocation] = useState(initialLocation || "");
  const [showLocationInput, setShowLocationInput] = useState(!!initialLocation);
  const [selectedFeeling, setSelectedFeeling] = useState<{ emoji: string; label: string } | null>(() => {
    if (!initialFeeling) return null;
    const parts = initialFeeling.split(" ");
    return { emoji: parts[0], label: parts.slice(1).join(" ") };
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTab, setEmojiTab] = useState<"emoji" | "feeling">("emoji");
  const [hashtags, setHashtags] = useState("");
  const [showHashtags, setShowHashtags] = useState(false);

  // Drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const privacyRef = useRef<HTMLDivElement>(null);

  const allImages = [...existingUrls, ...newPreviews];
  const hasMedia = allImages.length > 0;
  const canUseBg = !hasMedia && content.length > 0 && content.length <= 200;

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setContent(initialContent);
      setExistingUrls(initialImageUrls);
      setNewFiles([]);
      setNewPreviews([]);
      setPrivacy(PRIVACY_OPTIONS.find(p => p.id === initialPrivacy) || PRIVACY_OPTIONS[0]);
      setSelectedBg(TEXT_BACKGROUNDS.find(b => b.id === (initialBackgroundStyle || "none")) || TEXT_BACKGROUNDS[0]);
      setLocation(initialLocation || "");
      setShowLocationInput(!!initialLocation);
      if (initialFeeling) {
        const parts = initialFeeling.split(" ");
        setSelectedFeeling({ emoji: parts[0], label: parts.slice(1).join(" ") });
      } else {
        setSelectedFeeling(null);
      }
      setHashtags("");
      setShowHashtags(false);
      setShowEmojiPicker(false);
      setShowBgPicker(false);
      setShowPrivacyMenu(false);
    }
  }, [open, initialContent, initialImageUrls, initialPrivacy, initialBackgroundStyle, initialLocation, initialFeeling]);

  // Close popups on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
      if (privacyRef.current && !privacyRef.current.contains(e.target as Node)) setShowPrivacyMenu(false);
    };
    if (showEmojiPicker || showPrivacyMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker, showPrivacyMenu]);

  // Reset bg if media added
  useEffect(() => {
    if (hasMedia && selectedBg.id !== "none") setSelectedBg(TEXT_BACKGROUNDS[0]);
  }, [hasMedia, selectedBg.id]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_IMAGES - allImages.length;
    const selected = files.slice(0, remaining);
    for (const file of selected) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} excede o limite de 5MB`);
        return;
      }
    }
    setNewFiles((prev) => [...prev, ...selected]);
    setNewPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    if (idx < existingUrls.length) {
      setExistingUrls((prev) => prev.filter((_, i) => i !== idx));
    } else {
      const newIdx = idx - existingUrls.length;
      URL.revokeObjectURL(newPreviews[newIdx]);
      setNewFiles((prev) => prev.filter((_, i) => i !== newIdx));
      setNewPreviews((prev) => prev.filter((_, i) => i !== newIdx));
    }
  };

  const handleDragStart = useCallback((idx: number) => setDragIdx(idx), []);
  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }

    const combined = [...existingUrls, ...newPreviews];
    const combinedFiles = [...existingUrls.map(() => null as File | null), ...newFiles];
    const [movedUrl] = combined.splice(dragIdx, 1);
    const [movedFile] = combinedFiles.splice(dragIdx, 1);
    combined.splice(dropIdx, 0, movedUrl);
    combinedFiles.splice(dropIdx, 0, movedFile);

    const updatedExisting: string[] = [];
    const updatedFiles: File[] = [];
    const updatedPreviews: string[] = [];
    combined.forEach((url, i) => {
      if (combinedFiles[i] === null) {
        updatedExisting.push(url);
      } else {
        updatedFiles.push(combinedFiles[i]!);
        updatedPreviews.push(url);
      }
    });

    setExistingUrls(updatedExisting);
    setNewFiles(updatedFiles);
    setNewPreviews(updatedPreviews);
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, existingUrls, newFiles, newPreviews]);

  const handleSave = async () => {
    if (!content.trim() && allImages.length === 0) return;
    if (!user) return;
    setSaving(true);
    try {
      // Upload new files
      const uploadedNewUrls: string[] = [];
      for (const file of newFiles) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("post-images").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(filePath);
        uploadedNewUrls.push(urlData.publicUrl);
      }

      const finalUrls = [...existingUrls, ...uploadedNewUrls];

      // Build final content with hashtags
      let finalContent = content.trim();
      if (hashtags.trim()) {
        const tags = hashtags.trim().split(/[\s,]+/).filter(Boolean).map(t => t.startsWith("#") ? t : `#${t}`);
        finalContent += "\n\n" + tags.join(", ");
      }

      // Save current version to edit history before updating
      if (user) {
        await supabase.from("post_edit_history" as any).insert({
          post_id: postId,
          user_id: user.id,
          content: initialContent,
          privacy: initialPrivacy,
          location: initialLocation || null,
          feeling: initialFeeling || null,
          background_style: initialBackgroundStyle || null,
        });
      }

      const { error } = await supabase
        .from("posts")
        .update({
          content: finalContent,
          image_url: finalUrls[0] || null,
          image_urls: finalUrls,
          privacy: privacy.id,
          background_style: selectedBg.id === "none" ? null : selectedBg.id,
          location: location.trim() || null,
          feeling: selectedFeeling ? `${selectedFeeling.emoji} ${selectedFeeling.label}` : null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", postId);
      if (error) throw error;
      toast.success("Publicação atualizada com sucesso");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (error: any) {
      toast.error(error.message || "Falha ao atualizar publicação");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 rounded-xl overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/60">
          <DialogTitle className="text-center text-lg font-semibold">Editar publicação</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-4 space-y-4">
            {/* Author info + Privacy */}
            <div className="flex items-center gap-3">
              <img
                src={authorAvatar || defaultAvatar}
                alt={authorName}
                className="w-10 h-10 rounded-full object-cover border-2 border-border"
              />
              <div>
                <p className="font-semibold text-sm text-foreground">{authorName}</p>
                <div className="relative" ref={privacyRef}>
                  <button
                    onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <privacy.icon className="w-3 h-3" />
                    {privacy.label}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showPrivacyMenu && (
                    <div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden w-56">
                      {PRIVACY_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => { setPrivacy(opt); setShowPrivacyMenu(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent/60 transition-colors ${privacy.id === opt.id ? 'bg-accent/40' : ''}`}
                        >
                          <opt.icon className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{opt.label}</p>
                            <p className="text-xs text-muted-foreground">{opt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content textarea with background preview */}
            {canUseBg && selectedBg.id !== "none" ? (
              <div className={`${selectedBg.style} rounded-xl min-h-[180px] flex items-center justify-center p-6 relative`}>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="No que você está pensando?"
                  className="w-full bg-transparent text-center text-xl font-bold placeholder:text-white/60 outline-none resize-none min-h-[100px]"
                  autoFocus
                />
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="No que você está pensando?"
                className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[100px]"
                autoFocus
              />
            )}

            {/* Feeling badge */}
            {selectedFeeling && (
              <div className="flex items-center gap-2 text-sm">
                <span>{selectedFeeling.emoji}</span>
                <span className="text-muted-foreground">Sentindo-se <strong className="text-foreground">{selectedFeeling.label}</strong></span>
                <button onClick={() => setSelectedFeeling(null)} className="ml-1 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Location input */}
            {showLocationInput && (
              <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                <MapPin className="w-4 h-4 text-destructive shrink-0" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Onde você está?"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button onClick={() => { setShowLocationInput(false); setLocation(""); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Hashtags input */}
            {showHashtags && (
              <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                <Hash className="w-4 h-4 text-primary shrink-0" />
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="Adicionar hashtags (separadas por vírgula)"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button onClick={() => { setShowHashtags(false); setHashtags(""); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Image grid */}
            {allImages.length > 0 && (
              <div className="relative rounded-lg overflow-hidden border border-border p-2">
                {allImages.length > 1 && (
                  <p className="text-xs text-muted-foreground mb-1.5 text-center flex items-center justify-center gap-1">
                    <GripVertical className="w-3 h-3" /> Arraste para reordenar
                  </p>
                )}
                <div className={`grid gap-2 ${allImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${allImages.length > 4 ? 'max-h-[200px] overflow-y-auto' : ''}`}>
                  {allImages.map((preview, idx) => (
                    <div
                      key={`${preview}-${idx}`}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                      className={`relative group cursor-grab active:cursor-grabbing rounded-lg transition-all ${
                        dragIdx === idx ? 'opacity-40 scale-95' : ''
                      } ${dragOverIdx === idx && dragIdx !== idx ? 'ring-2 ring-primary' : ''}`}
                    >
                      <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-[120px] object-cover rounded-lg pointer-events-none" />
                      <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-card/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-3 h-3 text-foreground" />
                      </div>
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-card/80 hover:bg-card flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-center">{allImages.length}/{MAX_IMAGES} imagens</p>
              </div>
            )}

            {/* Background picker */}
            {showBgPicker && canUseBg && (
              <div className="flex gap-1.5 flex-wrap">
                {TEXT_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => { setSelectedBg(bg); setShowBgPicker(false); }}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      selectedBg.id === bg.id ? 'border-primary scale-110' : 'border-border hover:border-muted-foreground'
                    } ${bg.id === "none" ? 'bg-card' : bg.style}`}
                    title={bg.label}
                  />
                ))}
              </div>
            )}

            {/* Emoji / Feeling picker */}
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="bg-card border border-border rounded-xl p-3 shadow-lg">
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setEmojiTab("emoji")}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${emojiTab === "emoji" ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                  >
                    Emojis
                  </button>
                  <button
                    onClick={() => setEmojiTab("feeling")}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${emojiTab === "feeling" ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                  >
                    Sentimento
                  </button>
                </div>
                {emojiTab === "emoji" ? (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {EMOJI_CATEGORIES.slice(0, 3).map((cat) => (
                      <div key={cat.label}>
                        <p className="text-[10px] text-muted-foreground font-medium mb-1">{cat.label}</p>
                        <div className="flex flex-wrap gap-1">
                          {cat.emojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => { setContent((prev) => prev + emoji); }}
                              className="text-lg hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 max-h-[160px] overflow-y-auto">
                    {FEELINGS.map((f) => (
                      <button
                        key={f.label}
                        onClick={() => { setSelectedFeeling(f); setShowEmojiPicker(false); }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                          selectedFeeling?.label === f.label ? 'bg-primary/10 text-primary' : 'hover:bg-accent/60'
                        }`}
                      >
                        <span className="text-base">{f.emoji}</span>
                        <span className="capitalize">{f.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add to your post toolbar */}
            <div className="border border-border rounded-xl p-3">
              <p className="text-sm font-medium text-foreground mb-2">Adicionar à sua publicação</p>
              <div className="flex items-center gap-1">
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={allImages.length >= MAX_IMAGES}
                  className="p-2 rounded-lg hover:bg-accent/60 transition-colors disabled:opacity-40"
                  title="Adicionar fotos"
                >
                  <ImageIcon className="w-5 h-5 text-green-500" />
                </button>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 rounded-lg hover:bg-accent/60 transition-colors"
                  title="Emoji / Sentimento"
                >
                  <Smile className="w-5 h-5 text-amber-500" />
                </button>
                <button
                  onClick={() => setShowLocationInput(!showLocationInput)}
                  className={`p-2 rounded-lg hover:bg-accent/60 transition-colors ${showLocationInput ? 'bg-accent/60' : ''}`}
                  title="Check-in"
                >
                  <MapPin className="w-5 h-5 text-destructive" />
                </button>
                <button
                  onClick={() => setShowBgPicker(!showBgPicker)}
                  disabled={!canUseBg}
                  className="p-2 rounded-lg hover:bg-accent/60 transition-colors disabled:opacity-40"
                  title="Plano de fundo"
                >
                  <Palette className="w-5 h-5 text-cyan-500" />
                </button>
                <button
                  onClick={() => setShowHashtags(!showHashtags)}
                  className={`p-2 rounded-lg hover:bg-accent/60 transition-colors ${showHashtags ? 'bg-accent/60' : ''}`}
                  title="Hashtags"
                >
                  <Hash className="w-5 h-5 text-primary" />
                </button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Save button */}
        <div className="px-4 py-3 border-t border-border/60">
          <button
            onClick={handleSave}
            disabled={(!content.trim() && allImages.length === 0) || saving}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPostModal;
