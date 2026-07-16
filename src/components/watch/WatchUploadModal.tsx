import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = ["Gaming", "Music", "Sports", "News", "Education", "Entertainment", "Tech", "Cooking", "Travel"];

const categoryTranslations: Record<string, string> = {
  "Gaming": "Jogos",
  "Music": "Música",
  "Sports": "Esportes",
  "News": "Notícias",
  "Education": "Educação",
  "Entertainment": "Entretenimento",
  "Tech": "Tecnologia",
  "Cooking": "Culinária",
  "Travel": "Viagem"
};

const WatchUploadModal = ({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!user || !file || !title.trim()) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("post-videos").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("post-videos").getPublicUrl(path);

      const { error: insertError } = await supabase.from("watch_videos").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        video_url: publicUrl,
        category,
      });
      if (insertError) throw insertError;

      toast.success("Vídeo enviado!");
      setTitle(""); setDescription(""); setCategory("general"); setFile(null);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Falha no envio");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Vídeo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Título do vídeo *" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat.toLowerCase()}>{categoryTranslations[cat] || cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
          />
          <Button onClick={handleUpload} disabled={uploading || !title.trim() || !file} className="w-full">
            {uploading ? "Enviando..." : "Enviar Vídeo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WatchUploadModal;
