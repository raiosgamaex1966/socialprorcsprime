import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, Code, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface EmbedPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postContent: string;
  authorName: string;
  avatarUrl?: string | null;
  imageUrl?: string | null;
}

const SIZE_PRESETS = [
  { label: "Pequeno", width: 400, height: 300 },
  { label: "Médio", width: 500, height: 400 },
  { label: "Grande", width: 600, height: 500 },
] as const;

const EmbedPostModal = ({ open, onOpenChange, postId, postContent, authorName, avatarUrl, imageUrl }: EmbedPostModalProps) => {
  const [sizePreset, setSizePreset] = useState<number>(1);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showMedia, setShowMedia] = useState(true);
  const [copied, setCopied] = useState(false);

  const embedUrl = useMemo(() => {
    const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/embed-post`;
    const params = new URLSearchParams({ id: postId, theme });
    if (!showMedia) params.set("media", "false");
    return `${base}?${params}`;
  }, [postId, theme, showMedia]);

  const { width, height } = SIZE_PRESETS[sizePreset];

  const embedCode = `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" style="border:none;border-radius:12px;overflow:hidden" loading="lazy"></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Código de incorporação copiado para a área de transferência");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            Incorporar Publicação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Live Preview */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Pré-visualização</Label>
            <div className="bg-secondary/50 rounded-lg p-4 flex items-center justify-center">
              <iframe
                src={embedUrl}
                width={Math.min(width, 520)}
                height={Math.min(height, 350)}
                style={{ border: "none", borderRadius: 12, overflow: "hidden" }}
                loading="lazy"
                title="Pré-visualização da incorporação"
              />
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            {/* Size */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Tamanho</Label>
              <div className="flex gap-1">
                {SIZE_PRESETS.map((preset, i) => (
                  <button
                    key={preset.label}
                    onClick={() => setSizePreset(i)}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      sizePreset === i
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {preset.label}
                    <span className="block text-[10px] opacity-70">{preset.width}×{preset.height}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Tema</Label>
              <div className="flex gap-1">
                {(["light", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      theme === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {t === "light" ? "Claro" : "Escuro"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Show media toggle */}
          {imageUrl && (
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Mostrar imagens</Label>
                <p className="text-xs text-muted-foreground">Incluir imagens da publicação no código</p>
              </div>
              <Switch checked={showMedia} onCheckedChange={setShowMedia} />
            </div>
          )}

          {/* Embed code */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Código de Incorporação</Label>
            <div className="relative">
              <pre className="bg-secondary rounded-lg p-3 text-xs text-foreground overflow-x-auto whitespace-pre-wrap break-all font-mono leading-relaxed">
                {embedCode}
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2 h-7 gap-1.5"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
          </div>

          {/* Direct link */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">Apenas publicações públicas podem ser incorporadas</p>
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
            >
              Abrir incorporação <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmbedPostModal;
