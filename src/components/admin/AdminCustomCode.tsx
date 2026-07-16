import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Code2, FileCode, Save, AlertTriangle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const AdminCustomCode = () => {
  const { settings, loading, saving, saveSettings } = useSiteSettings("custom_code");
  const [headCss, setHeadCss] = useState("");
  const [headJs, setHeadJs] = useState("");
  const [bodyCss, setBodyCss] = useState("");
  const [bodyJs, setBodyJs] = useState("");
  const [cssEnabled, setCssEnabled] = useState(true);
  const [jsEnabled, setJsEnabled] = useState(true);

  useEffect(() => {
    if (!settings) return;
    if (typeof settings.headCss === "string") setHeadCss(settings.headCss);
    if (typeof settings.headJs === "string") setHeadJs(settings.headJs);
    if (typeof settings.bodyCss === "string") setBodyCss(settings.bodyCss);
    if (typeof settings.bodyJs === "string") setBodyJs(settings.bodyJs);
    if (typeof settings.cssEnabled === "boolean") setCssEnabled(settings.cssEnabled);
    if (typeof settings.jsEnabled === "boolean") setJsEnabled(settings.jsEnabled);
  }, [settings]);

  const handleSave = async () => {
    await saveSettings({ headCss, headJs, bodyCss, bodyJs, cssEnabled, jsEnabled });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Code2 className="w-5 h-5 text-primary" />
          JS / CSS Personalizado
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione código JavaScript e CSS personalizado. O código é salvo no banco de dados e injetado globalmente pelo carregador em tempo de execução.
        </p>
      </div>

      <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
        <p className="text-xs text-destructive">
          Tenha cuidado ao adicionar código personalizado. JavaScript ou CSS inválido pode quebrar o layout ou a funcionalidade do seu site. Sempre teste as alterações em um ambiente seguro primeiro.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Alternadores Globais</CardTitle>
          <CardDescription className="text-xs">Ative ou desative todas as injeções de código personalizado de uma só vez.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex items-center gap-3">
              <Switch checked={cssEnabled} onCheckedChange={setCssEnabled} />
              <div>
                <Label className="text-sm font-medium">CSS Personalizado</Label>
                <p className="text-[10px] text-muted-foreground">
                  {cssEnabled ? "A injeção de CSS está ativa" : "A injeção de CSS está pausada"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={jsEnabled} onCheckedChange={setJsEnabled} />
              <div>
                <Label className="text-sm font-medium">JavaScript Personalizado</Label>
                <p className="text-[10px] text-muted-foreground">
                  {jsEnabled ? "A injeção de JS está ativa" : "A injeção de JS está pausada"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={!cssEnabled ? "opacity-60 pointer-events-none" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">CSS — Head</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Injetado dentro de <code className="text-[10px] bg-muted px-1 py-0.5 rounded">&lt;head&gt;</code> — ideal para substituir estilos, fontes e variáveis CSS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={headCss}
            onChange={(e) => setHeadCss(e.target.value)}
            placeholder={`/* CSS Personalizado */\n.my-class {\n  color: red;\n}`}
            className="font-mono text-xs min-h-[140px] resize-y"
          />
        </CardContent>
      </Card>

      <Card className={!cssEnabled ? "opacity-60 pointer-events-none" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">CSS — Body</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Injetado no final de <code className="text-[10px] bg-muted px-1 py-0.5 rounded">&lt;body&gt;</code> — útil para substituições específicas de componentes que exigem maior especificidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={bodyCss}
            onChange={(e) => setBodyCss(e.target.value)}
            placeholder={`/* Substituições de CSS do Body */\n.footer {\n  background: #222;\n}`}
            className="font-mono text-xs min-h-[140px] resize-y"
          />
        </CardContent>
      </Card>

      <Separator />

      <Card className={!jsEnabled ? "opacity-60 pointer-events-none" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">JavaScript — Head</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Injetado dentro de <code className="text-[10px] bg-muted px-1 py-0.5 rounded">&lt;head&gt;</code> — melhor para scripts de análise, pixels de rastreamento e integrações de terceiros.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={headJs}
            onChange={(e) => setHeadJs(e.target.value)}
            placeholder={`// Código de análise ou rastreamento\n(function() {\n  // Seu código aqui\n})();`}
            className="font-mono text-xs min-h-[140px] resize-y"
          />
        </CardContent>
      </Card>

      <Card className={!jsEnabled ? "opacity-60 pointer-events-none" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4.5 h-4.5 text-primary" />
            <CardTitle className="text-base">JavaScript — Body</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Injetado no final de <code className="text-[10px] bg-muted px-1 py-0.5 rounded">&lt;body&gt;</code> — executado após o DOM estar pronto. Ideal para manipulação do DOM e inicialização de widgets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={bodyJs}
            onChange={(e) => setBodyJs(e.target.value)}
            placeholder={`// Scripts executados ao carregar o DOM\ndocument.addEventListener('DOMContentLoaded', function() {\n  // Seu código aqui\n});`}
            className="font-mono text-xs min-h-[140px] resize-y"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving || loading}>
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? "Salvando..." : "Salvar Código Personalizado"}
        </Button>
      </div>
    </div>
  );
};

export default AdminCustomCode;
