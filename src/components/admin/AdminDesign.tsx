import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import {
  Image,
  Loader2,
  MousePointerClick,
  Palette,
  PanelTop,
  RefreshCw,
  Save,
  SquareAsterisk,
  Trash2,
  Upload
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  description?: string;
}

const ColorField = ({ label, value, onChange, description }: ColorFieldProps) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium text-foreground">{label}</Label>
    <div className="flex items-center gap-2">
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded-md border border-input cursor-pointer p-0.5"
        />
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-sm font-mono max-w-[120px]"
        placeholder="#000000"
      />
    </div>
    {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
  </div>
);

interface ImageUploadFieldProps {
  label: string;
  description: string;
  preview: string | null;
  uploading: boolean;
  onFileChange: (file: File | null) => void;
  onRemove?: () => void;
}

const ImageUploadField = ({ label, description, preview, uploading, onFileChange, onRemove }: ImageUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <p className="text-[10px] text-muted-foreground">{description}</p>
      <div
        className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 transition-colors bg-muted/20 min-h-[80px]"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        ) : preview ? (
          <img src={preview} alt={label} className="max-h-16 object-contain" />
        ) : (
          <>
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Clique para enviar</span>
          </>
        )}
      </div>
      {preview && onRemove && (
        <Button variant="ghost" size="sm" className="text-xs text-destructive gap-1" onClick={onRemove}>
          <Trash2 className="w-3 h-3" /> Remover
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          onFileChange(file);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
};

async function uploadSiteAsset(file: File, path: string): Promise<string | null> {
  const { error } = await supabase.storage
    .from("site-assets")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    toast.error("Upload falhou: " + error.message);
    return null;
  }

  const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
  return urlData?.publicUrl || null;
}

const AdminDesign = () => {
  const { settings: savedDesign, loading: designLoading, saving, saveSettings } = useSiteSettings("admin_design");

  // Uploaded URLs
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [darkLogoUrl, setDarkLogoUrl] = useState<string | null>(null);

  // Upload states
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDarkLogo, setUploadingDarkLogo] = useState(false);

  // Header Colors
  const [headerBgColor, setHeaderBgColor] = useState("#247b7b");
  const [headerTextColor, setHeaderTextColor] = useState("#ffffff");
  const [headerSearchBgColor, setHeaderSearchBgColor] = useState("#1a6b6b");
  const [headerShadowColor, setHeaderShadowColor] = useState("#0d5c63");

  // Body
  const [bodyBgColor, setBodyBgColor] = useState("#f0f2f5");

  // Buttons
  const [btnTextColor, setBtnTextColor] = useState("#ffffff");
  const [btnBgColor, setBtnBgColor] = useState("#247b7b");
  const [btnHoverTextColor, setBtnHoverTextColor] = useState("#ffffff");
  const [btnHoverBgColor, setBtnHoverBgColor] = useState("#1a6b6b");
  const [btnDisabledBgColor, setBtnDisabledBgColor] = useState("#a0a0a0");

  // Load saved design settings
  useEffect(() => {
    if (!designLoading && savedDesign && Object.keys(savedDesign).length > 0) {
      const s = savedDesign;
      if (s.faviconUrl) setFaviconUrl(s.faviconUrl);
      if (s.logoUrl) setLogoUrl(s.logoUrl);
      if (s.darkLogoUrl) setDarkLogoUrl(s.darkLogoUrl);
      if (s.headerBgColor) setHeaderBgColor(s.headerBgColor);
      if (s.headerTextColor) setHeaderTextColor(s.headerTextColor);
      if (s.headerSearchBgColor) setHeaderSearchBgColor(s.headerSearchBgColor);
      if (s.headerShadowColor) setHeaderShadowColor(s.headerShadowColor);
      if (s.bodyBgColor) setBodyBgColor(s.bodyBgColor);
      if (s.btnTextColor) setBtnTextColor(s.btnTextColor);
      if (s.btnBgColor) setBtnBgColor(s.btnBgColor);
      if (s.btnHoverTextColor) setBtnHoverTextColor(s.btnHoverTextColor);
      if (s.btnHoverBgColor) setBtnHoverBgColor(s.btnHoverBgColor);
      if (s.btnDisabledBgColor) setBtnDisabledBgColor(s.btnDisabledBgColor);
    }
  }, [designLoading, savedDesign]);

  const handleUpload = async (
    file: File | null,
    path: string,
    setter: (url: string | null) => void,
    setUploading: (v: boolean) => void
  ) => {
    if (!file) return;
    setUploading(true);
    const url = await uploadSiteAsset(file, path);
    if (url) {
      // Append cache-buster so browser reloads the new image
      setter(url + "?t=" + Date.now());
      toast.success("Imagem enviada com sucesso");
    }
    setUploading(false);
  };

  const handleSave = async () => {
    await saveSettings({
      faviconUrl, logoUrl, darkLogoUrl,
      headerBgColor, headerTextColor, headerSearchBgColor, headerShadowColor,
      bodyBgColor, btnTextColor, btnBgColor, btnHoverTextColor, btnHoverBgColor,
      btnDisabledBgColor,
    });
  };

  const handleResetColors = () => {
    setHeaderBgColor("#247b7b");
    setHeaderTextColor("#ffffff");
    setHeaderSearchBgColor("#1a6b6b");
    setHeaderShadowColor("#0d5c63");
    setBodyBgColor("#f0f2f5");
    setBtnTextColor("#ffffff");
    setBtnBgColor("#247b7b");
    setBtnHoverTextColor("#ffffff");
    setBtnHoverBgColor("#1a6b6b");
    setBtnDisabledBgColor("#a0a0a0");
    toast.info("Cores redefinidas para o padrão");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Alterar Design do Site
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Personalize a identidade visual, cores e aparência geral do seu site.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleResetColors}>
          <RefreshCw className="w-3.5 h-3.5" />
          Redefinir para Padrão
        </Button>
      </div>

      {/* Favicon & Logos */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Image className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">Favicon e Logos</CardTitle>
          </div>
          <CardDescription className="text-xs">Envie o favicon e as imagens de logo do seu site. As alterações se aplicam após salvar.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <ImageUploadField
              label="Favicon"
              description="Pequeno ícone exibido nas abas do navegador. Recomendado: 32x32px ou 64x64px."
              preview={faviconUrl}
              uploading={uploadingFavicon}
              onFileChange={(f) => handleUpload(f, "favicon.png", setFaviconUrl, setUploadingFavicon)}
              onRemove={() => setFaviconUrl(null)}
            />
            <ImageUploadField
              label="Logo (Modo Claro)"
              description="Logo principal do site exibida no cabeçalho durante o modo claro."
              preview={logoUrl}
              uploading={uploadingLogo}
              onFileChange={(f) => handleUpload(f, "logo.png", setLogoUrl, setUploadingLogo)}
              onRemove={() => setLogoUrl(null)}
            />
            <ImageUploadField
              label="Logo (Modo Escuro)"
              description="Variante da logo exibida quando o modo escuro/noturno está ativo."
              preview={darkLogoUrl}
              uploading={uploadingDarkLogo}
              onFileChange={(f) => handleUpload(f, "logo-dark.png", setDarkLogoUrl, setUploadingDarkLogo)}
              onRemove={() => setDarkLogoUrl(null)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Header Colors */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PanelTop className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">Cabeçalho</CardTitle>
          </div>
          <CardDescription className="text-xs">Personalize a aparência da barra de navegação.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Preview */}
          <div
            className="rounded-lg p-3 mb-4 flex items-center gap-3"
            style={{ backgroundColor: headerBgColor }}
          >
            <div className="text-sm font-bold" style={{ color: headerTextColor }}>Social Pro</div>
            <div
              className="flex-1 max-w-[200px] h-8 rounded-full px-3 flex items-center"
              style={{ backgroundColor: headerSearchBgColor }}
            >
              <span className="text-xs" style={{ color: headerTextColor + "80" }}>Pesquisar...</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                  style={{
                    backgroundColor: headerSearchBgColor,
                    color: headerTextColor,
                    boxShadow: `0 1px 3px ${headerShadowColor}40`,
                  }}
                >
                  ●
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ColorField label="Cor de Fundo" value={headerBgColor} onChange={setHeaderBgColor} />
            <ColorField label="Cor dos Ícones/Texto" value={headerTextColor} onChange={setHeaderTextColor} />
            <ColorField label="Fundo do Campo de Pesquisa" value={headerSearchBgColor} onChange={setHeaderSearchBgColor} />
            <ColorField label="Cor da Sombra dos Ícones" value={headerShadowColor} onChange={setHeaderShadowColor} />
          </div>
        </CardContent>
      </Card>

      {/* Body */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <SquareAsterisk className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">Corpo do Site</CardTitle>
          </div>
          <CardDescription className="text-xs">Defina a cor de fundo principal do site.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <ColorField label="Cor de Fundo do Corpo" value={bodyBgColor} onChange={setBodyBgColor} />
            <div
              className="w-24 h-16 rounded-lg border border-border"
              style={{ backgroundColor: bodyBgColor }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MousePointerClick className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">Botões</CardTitle>
          </div>
          <CardDescription className="text-xs">Personalize os estilos de botões em todo o site.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Button Previews */}
          <div className="flex items-center gap-3 mb-2">
            <button
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{ backgroundColor: btnBgColor, color: btnTextColor }}
            >
              Botão Padrão
            </button>
            <button
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{ backgroundColor: btnHoverBgColor, color: btnHoverTextColor }}
            >
              Estado de Hover
            </button>
            <button
              className="px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed opacity-70"
              style={{ backgroundColor: btnDisabledBgColor, color: btnTextColor }}
            >
              Desativado
            </button>
          </div>

          <Separator />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <ColorField label="Cor do Texto" value={btnTextColor} onChange={setBtnTextColor} />
            <ColorField label="Cor de Fundo" value={btnBgColor} onChange={setBtnBgColor} />
            <ColorField label="Cor do Texto no Hover" value={btnHoverTextColor} onChange={setBtnHoverTextColor} />
            <ColorField label="Cor de Fundo no Hover" value={btnHoverBgColor} onChange={setBtnHoverBgColor} />
            <ColorField label="Cor de Fundo Desativado" value={btnDisabledBgColor} onChange={setBtnDisabledBgColor} />
          </div>

          <p className="text-[10px] text-muted-foreground pt-2">
            Certifique-se de limpar o cache do navegador após alterar as configurações de design.
          </p>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? "Salvando..." : "Salvar Alterações de Design"}
        </Button>
      </div>
    </div>
  );
};

export default AdminDesign;
