import { useState } from "react";
import { X, Upload, Loader2, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PAGE_CATEGORIES } from "@/constants/pageCategories";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CreatePageProps {
  open: boolean;
  onClose: () => void;
}

const CreatePage = ({ open, onClose }: CreatePageProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("business");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) + "-" + Date.now().toString(36);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    try {
      let avatar_url: string | null = null;
      let cover_photo_url: string | null = null;

      const uploadImage = async (file: File, folder: string) => {
        const ext = file.name.split(".").pop();
        const path = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("page-images").upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("page-images").getPublicUrl(path);
        return urlData.publicUrl;
      };

      if (avatarFile) {
        avatar_url = await uploadImage(avatarFile, "pages");
      }
      if (coverFile) {
        cover_photo_url = await uploadImage(coverFile, "page-covers");
      }

      const { data: newPage, error } = await supabase.from("pages").insert({
        name: name.trim(),
        slug: generateSlug(name.trim()),
        category,
        description: description.trim() || null,
        avatar_url,
        cover_photo_url,
        created_by: user.id,
      }).select("id").single();

      if (error) throw error;

      // Auto-follow the page so posts appear in the creator's feed
      if (newPage) {
        await supabase.from("page_followers").insert({ page_id: newPage.id, user_id: user.id });
      }

      toast.success("Página criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      queryClient.invalidateQueries({ queryKey: ["my-pages"] });
      queryClient.invalidateQueries({ queryKey: ["my-page-follows"] });
      queryClient.invalidateQueries({ queryKey: ["my-followed-page-ids"] });
      onClose();
      setName("");
      setCategory("business");
      setDescription("");
      setAvatarFile(null);
      setAvatarPreview(null);
      setCoverFile(null);
      setCoverPreview(null);
    } catch (err: any) {
      toast.error(err.message || "Falha ao criar página");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Criar uma Página</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Cover Photo */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Foto de capa</label>
            <label className="relative cursor-pointer group block">
              <div className="w-full h-32 rounded-xl bg-secondary flex items-center justify-center overflow-hidden border-2 border-dashed border-border group-hover:border-primary transition-colors">
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Camera className="w-6 h-6" />
                    <span className="text-xs">Adicionar foto de capa</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); }
              }} />
            </label>
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <label className="relative cursor-pointer group">
              <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center overflow-hidden border-2 border-dashed border-border group-hover:border-primary transition-colors">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
            <div>
              <p className="text-sm font-medium text-foreground">Foto da página</p>
              <p className="text-xs text-muted-foreground">Envie um logotipo ou foto de perfil</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium text-foreground">Nome da página *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Meu Negócio Incrível"
              className="mt-1 w-full px-3 py-2.5 rounded-lg bg-secondary text-foreground border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-foreground">Categoria *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-lg bg-secondary text-foreground border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm"
            >
              {PAGE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Diga às pessoas sobre o que é a sua página..."
              rows={3}
              className="mt-1 w-full px-3 py-2.5 rounded-lg bg-secondary text-foreground border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar Página
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePage;
