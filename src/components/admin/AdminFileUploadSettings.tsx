import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload, Video, Music, FileText, Image, AlertTriangle, Info, Save, ExternalLink,
  HardDrive, Cloud, Server, Database, Play, Bug, Clapperboard,
} from "lucide-react";
import { toast } from "sonner";

const AWS_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-east-2", label: "US East (Ohio)" },
  { value: "us-west-1", label: "US West (N. California)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "af-south-1", label: "Africa (Cape Town)" },
  { value: "ap-east-1", label: "Asia Pacific (Hong Kong)" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul)" },
  { value: "ap-northeast-3", label: "Asia Pacific (Osaka)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-southeast-3", label: "Asia Pacific (Jakarta)" },
  { value: "ca-central-1", label: "Canada (Central)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
  { value: "eu-west-1", label: "Europe (Ireland)" },
  { value: "eu-west-2", label: "Europe (London)" },
  { value: "eu-west-3", label: "Europe (Paris)" },
  { value: "eu-south-1", label: "Europe (Milan)" },
  { value: "eu-north-1", label: "Europe (Stockholm)" },
  { value: "me-south-1", label: "Middle East (Bahrain)" },
  { value: "sa-east-1", label: "South America (São Paulo)" },
];

const DO_REGIONS = [
  { value: "nyc1", label: "New York [NYC1]" },
  { value: "nyc2", label: "New York [NYC2]" },
  { value: "nyc3", label: "New York [NYC3]" },
  { value: "sfo1", label: "San Francisco [SFO1]" },
  { value: "sfo2", label: "San Francisco [SFO2]" },
  { value: "tor1", label: "Toronto [TOR1]" },
  { value: "lon1", label: "London [LON1]" },
  { value: "fra1", label: "Frankfurt [FRA1]" },
  { value: "ams2", label: "Amsterdam [AMS2]" },
  { value: "ams3", label: "Amsterdam [AMS3]" },
  { value: "sgp1", label: "Singapore [SGP1]" },
  { value: "blr1", label: "Bangalore [BLR1]" },
];

const WASABI_REGIONS = [
  { value: "us-east-1", label: "us-east-1" },
  { value: "us-east-2", label: "us-east-2" },
  { value: "us-west-1", label: "us-west-1" },
  { value: "us-central-1", label: "us-central-1" },
  { value: "ca-central-1", label: "ca-central-1" },
  { value: "eu-west-1", label: "eu-west-1" },
  { value: "eu-west-2", label: "eu-west-2" },
  { value: "eu-central-1", label: "eu-central-1" },
  { value: "eu-central-2", label: "eu-central-2" },
  { value: "ap-northeast-1", label: "ap-northeast-1" },
  { value: "ap-northeast-2", label: "ap-northeast-2" },
  { value: "ap-southeast-1", label: "ap-southeast-1" },
  { value: "ap-southeast-2", label: "ap-southeast-2" },
];

const FFMPEG_SPEEDS = {
  ultrafast: "Ultra rápido (Ultrafast)",
  superfast: "Super rápido (Superfast)",
  veryfast: "Muito rápido (Veryfast)",
  faster: "Mais rápido (Faster)",
  fast: "Rápido (Fast)",
  medium: "Médio (Medium)",
  slow: "Lento (Slow)",
  slower: "Mais lento (Slower)",
  veryslow: "Muito lento (Veryslow)",
};

const AdminFileUploadSettings = () => {
  // Upload toggles
  const [fileUploadEnabled, setFileUploadEnabled] = useState(true);
  const [videoUploadEnabled, setVideoUploadEnabled] = useState(true);
  const [reelsUploadEnabled, setReelsUploadEnabled] = useState(true);
  const [audioUploadEnabled, setAudioUploadEnabled] = useState(false);
  const [cssUploadEnabled, setCssUploadEnabled] = useState(false);

  // Upload limits
  const [allowedExtensions, setAllowedExtensions] = useState("jpg,png,gif,webp,mp4,mp3,pdf,doc,docx");
  const [allowedMimeTypes, setAllowedMimeTypes] = useState("image/jpeg,image/png,image/gif,image/webp,video/mp4,audio/mpeg,application/pdf");
  const [maxUploadSize, setMaxUploadSize] = useState("96");
  const [imageCompression, setImageCompression] = useState("medium");

  // FFMPEG
  const [ffmpegEnabled, setFfmpegEnabled] = useState(false);
  const [ffmpegPath, setFfmpegPath] = useState("/usr/bin/ffmpeg");
  const [ffmpegSpeed, setFfmpegSpeed] = useState("medium");
  const [ffmpegExtensions, setFfmpegExtensions] = useState("mp4,avi,mov,wmv,flv,mkv,webm");
  const [ffmpegMimeTypes, setFfmpegMimeTypes] = useState("video/mp4,video/avi,video/quicktime,video/x-ms-wmv,video/x-flv,video/x-matroska,video/webm");
  const [debugLog, setDebugLog] = useState("");

  // Storage providers — only one active at a time
  const [activeStorage, setActiveStorage] = useState<"local" | "s3" | "digitalocean" | "wasabi" | "ftp" | "gcloud" | "backblaze">("local");

  // Amazon S3
  const [s3Bucket, setS3Bucket] = useState("");
  const [s3Key, setS3Key] = useState("");
  const [s3Secret, setS3Secret] = useState("");
  const [s3Endpoint, setS3Endpoint] = useState("");
  const [s3Region, setS3Region] = useState("us-east-1");

  // DigitalOcean
  const [doSpace, setDoSpace] = useState("");
  const [doKey, setDoKey] = useState("");
  const [doSecret, setDoSecret] = useState("");
  const [doEndpoint, setDoEndpoint] = useState("");
  const [doRegion, setDoRegion] = useState("nyc1");

  // Wasabi
  const [wasabiBucket, setWasabiBucket] = useState("");
  const [wasabiAccessKey, setWasabiAccessKey] = useState("");
  const [wasabiSecretKey, setWasabiSecretKey] = useState("");
  const [wasabiEndpoint, setWasabiEndpoint] = useState("");
  const [wasabiRegion, setWasabiRegion] = useState("us-east-1");

  // FTP
  const [ftpHost, setFtpHost] = useState("");
  const [ftpUsername, setFtpUsername] = useState("");
  const [ftpPassword, setFtpPassword] = useState("");
  const [ftpPort, setFtpPort] = useState("21");
  const [ftpPath, setFtpPath] = useState("/upload");
  const [ftpEndpointUrl, setFtpEndpointUrl] = useState("");

  // Google Cloud
  const [gcloudBucket, setGcloudBucket] = useState("");
  const [gcloudFilePath, setGcloudFilePath] = useState("");
  const [gcloudEndpoint, setGcloudEndpoint] = useState("");

  // Backblaze
  const [bbBucketId, setBbBucketId] = useState("");
  const [bbBucketName, setBbBucketName] = useState("");
  const [bbRegion, setBbRegion] = useState("");
  const [bbAccessKeyId, setBbAccessKeyId] = useState("");
  const [bbAccessKey, setBbAccessKey] = useState("");
  const [bbEndpoint, setBbEndpoint] = useState("");

  const handleSave = () => {
    toast.success("Configurações de upload de arquivos salvas com sucesso");
  };

  const handleDebugFfmpeg = () => {
    setDebugLog("Verificando instalação do FFMPEG...\n\n> " + ffmpegPath + " -version\n\nFFMPEG não está instalado ou o caminho está incorreto.\nPor favor, verifique o caminho do binário e garanta que o FFMPEG esteja instalado em seu servidor.");
  };

  const handleTestConnection = (provider: string) => {
    toast.info(`Testando conexão do ${provider}...`);
    setTimeout(() => toast.success(`Teste de conexão do ${provider} concluído`), 1500);
  };

  const setStorageProvider = (provider: typeof activeStorage) => {
    setActiveStorage(provider);
  };

  return (
    <div className="space-y-6">
      {/* Upload & File Sharing */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Configuração de Upload e Compartilhamento de Arquivos</CardTitle>
          </div>
          <CardDescription>Controle quais tipos de arquivo os usuários podem enviar e compartilhar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Upload e Compartilhamento de Arquivos</Label>
              <p className="text-xs text-muted-foreground">Ao habilitar este recurso, os usuários poderão compartilhar e enviar arquivos em seu site.</p>
            </div>
            <Switch checked={fileUploadEnabled} onCheckedChange={setFileUploadEnabled} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Upload e Compartilhamento de Vídeos</Label>
                <Video className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Ative a capacidade de os usuários compartilharem e enviarem vídeos. Configure o conversor de vídeo nas Configurações do FFMPEG abaixo.</p>
            </div>
            <Switch checked={videoUploadEnabled} onCheckedChange={setVideoUploadEnabled} disabled={!fileUploadEnabled} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Upload de Reels</Label>
                <Clapperboard className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Ative a capacidade de os usuários compartilharem e enviarem reels. Configure o conversor de vídeo nas Configurações do FFMPEG abaixo.</p>
            </div>
            <Switch checked={reelsUploadEnabled} onCheckedChange={setReelsUploadEnabled} disabled={!fileUploadEnabled} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Upload e Compartilhamento de Áudio</Label>
                <Music className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Ative a capacidade de os usuários compartilharem e enviarem músicas e arquivos de áudio.</p>
            </div>
            <Switch checked={audioUploadEnabled} onCheckedChange={setAudioUploadEnabled} disabled={!fileUploadEnabled} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Upload e Modificações de CSS</Label>
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Permita que os usuários enviem seus próprios arquivos CSS para personalizar o perfil.</p>
            </div>
            <Switch checked={cssUploadEnabled} onCheckedChange={setCssUploadEnabled} disabled={!fileUploadEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Upload & File Limits */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Limites de Upload e Arquivos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="p-3 rounded-lg bg-destructive/10 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">
              <strong>Importante:</strong> Certifique-se de não permitir arquivos PHP, JS, HTML, XML, XPHP, PHP5 — seu site pode ficar em risco.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Extensões Permitidas</Label>
            <Textarea
              value={allowedExtensions}
              onChange={(e) => setAllowedExtensions(e.target.value)}
              placeholder="jpg,png,gif,webp,mp4..."
              rows={2}
            />
            <p className="text-[11px] text-muted-foreground">Apenas estes tipos de arquivo podem ser enviados. (separados por vírgula)</p>
          </div>

          <div className="space-y-2">
            <Label>Tipos MIME Permitidos</Label>
            <Textarea
              value={allowedMimeTypes}
              onChange={(e) => setAllowedMimeTypes(e.target.value)}
              placeholder="image/jpeg,image/png..."
              rows={2}
            />
            <p className="text-[11px] text-muted-foreground">Apenas estes tipos MIME podem ser enviados. (separados por vírgula)</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tamanho Máximo de Upload</Label>
              <Select value={maxUploadSize} onValueChange={setMaxUploadSize}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["2", "6", "12", "24", "48", "96", "256", "512", "1024", "5120", "10240"].map((v) => (
                    <SelectItem key={v} value={v}>
                      {Number(v) >= 1024 ? `${Number(v) / 1024} GB` : `${v} MB`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Tamanho máximo de upload para arquivos, vídeos, músicas e imagens.</p>
            </div>

            <div className="space-y-2">
              <Label>Nível de Compressão de Imagem</Label>
              <Select value={imageCompression} onValueChange={setImageCompression}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="very-low">Muito Baixo</SelectItem>
                  <SelectItem value="low">Baixo</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="very-high">Muito Alto</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Maior compressão = menor qualidade, mas menor tamanho de arquivo.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FFMPEG Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Configurações do Conversor de Vídeo FFMPEG</CardTitle>
          </div>
          <CardDescription>Comprima, converta e otimize vídeos para MP4</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Sistema FFMPEG</Label>
              <p className="text-xs text-muted-foreground">Este sistema irá comprimir, converter e otimizar vídeos para MP4. Requer "ffmpeg" instalado em seu servidor.</p>
            </div>
            <Switch checked={ffmpegEnabled} onCheckedChange={setFfmpegEnabled} />
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Caminho do Arquivo Binário do FFMPEG</Label>
              <Input
                value={ffmpegPath}
                onChange={(e) => setFfmpegPath(e.target.value)}
                placeholder="/usr/bin/ffmpeg"
                disabled={!ffmpegEnabled}
              />
              <p className="text-[11px] text-muted-foreground">Exemplo: Linux (/usr/bin/ffmpeg) ou Windows (C:\ffmpeg\bin\ffmpeg.exe)</p>
            </div>

            <div className="space-y-2">
              <Label>Velocidade de Conversão de Vídeo</Label>
              <Select value={ffmpegSpeed} onValueChange={setFfmpegSpeed} disabled={!ffmpegEnabled}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {FFMPEG_SPEEDS[s as keyof typeof FFMPEG_SPEEDS] || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Preset mais lento = melhor compressão/qualidade. Preset mais rápido = pior compressão, maior tamanho de arquivo.</p>
            </div>

            <div className="space-y-2">
              <Label>Extensões de Vídeo Permitidas</Label>
              <Textarea
                value={ffmpegExtensions}
                onChange={(e) => setFfmpegExtensions(e.target.value)}
                rows={2}
                disabled={!ffmpegEnabled}
              />
              <p className="text-[11px] text-muted-foreground">Apenas estes tipos de vídeo podem ser enviados. (separados por vírgula)</p>
            </div>

            <div className="space-y-2">
              <Label>Tipos MIME de Vídeo Permitidos</Label>
              <Textarea
                value={ffmpegMimeTypes}
                onChange={(e) => setFfmpegMimeTypes(e.target.value)}
                rows={2}
                disabled={!ffmpegEnabled}
              />
              <p className="text-[11px] text-muted-foreground">Apenas estes tipos MIME podem ser enviados. (separados por vírgula)</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-secondary/50 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">Certifique-se de depurar o FFMPEG abaixo após configurar. Para mais informações, visite nossa página de Documentação.</p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Depurar FFMPEG</Label>
              </div>
              <Button variant="outline" size="sm" onClick={handleDebugFfmpeg} disabled={!ffmpegEnabled}>
                Executar Depuração
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Isso testará a configuração do FFMPEG e verificará se o sistema está funcionando.</p>
            {debugLog && (
              <pre className="p-3 rounded-lg bg-muted text-xs text-muted-foreground font-mono whitespace-pre-wrap border">
                {debugLog}
              </pre>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Storage & CDN */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Configuração de Armazenamento e CDN</CardTitle>
          </div>
          <CardDescription>Configure provedores de armazenamento externo para hospedagem de arquivos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="p-3 rounded-lg bg-destructive/10 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">
              <strong>Importante:</strong> Você não pode habilitar múltiplos armazenamentos ao mesmo tempo. Habilitar um irá desabilitar automaticamente os outros.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/50 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">Para mais informações sobre como configurar armazenamento de terceiros, por favor visite nossa página de Documentação.</p>
          </div>
        </CardContent>
      </Card>

      {/* Amazon S3 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Configuração do Amazon S3</CardTitle>
                <CardDescription className="mt-1">Armazene arquivos no Amazon S3</CardDescription>
              </div>
            </div>
            <Badge variant={activeStorage === "s3" ? "default" : "secondary"} className="text-xs">
              {activeStorage === "s3" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Armazenamento Amazon S3</Label>
              <p className="text-xs text-muted-foreground">Habilite o Armazenamento Amazon para salvar seus arquivos no Amazon S3.</p>
            </div>
            <Switch checked={activeStorage === "s3"} onCheckedChange={(c) => setStorageProvider(c ? "s3" : "local")} />
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nome do Bucket (Bucket Name)</Label>
              <Input value={s3Bucket} onChange={(e) => setS3Bucket(e.target.value)} placeholder="Nome do seu Bucket Amazon S3" disabled={activeStorage !== "s3"} />
            </div>
            <div className="space-y-2">
              <Label>Chave S3 (S3 Key)</Label>
              <Input value={s3Key} onChange={(e) => setS3Key(e.target.value)} placeholder="Sua Chave Amazon das credenciais AWS" disabled={activeStorage !== "s3"} />
            </div>
            <div className="space-y-2">
              <Label>Chave Secreta S3 (S3 Secret Key)</Label>
              <Input type="password" value={s3Secret} onChange={(e) => setS3Secret(e.target.value)} placeholder="Seu Segredo Amazon das credenciais AWS" disabled={activeStorage !== "s3"} />
              <p className="text-[11px] text-muted-foreground">A chave secreta não é exibida por motivos de segurança, mas você ainda pode sobrescrever a atual.</p>
            </div>
            <div className="space-y-2">
              <Label>Endpoint Personalizado (Opcional)</Label>
              <Input value={s3Endpoint} onChange={(e) => setS3Endpoint(e.target.value)} placeholder="https://customCDNdomain.com" disabled={activeStorage !== "s3"} />
            </div>
            <div className="space-y-2">
              <Label>Região do Bucket</Label>
              <Select value={s3Region} onValueChange={setS3Region} disabled={activeStorage !== "s3"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AWS_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label} ({r.value})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeStorage === "s3" && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => handleTestConnection("Amazon S3")}>Testar Conexão</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DigitalOcean Spaces */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Configuração do DigitalOcean Spaces</CardTitle>
                <CardDescription className="mt-1">Armazene arquivos no DigitalOcean Spaces</CardDescription>
              </div>
            </div>
            <Badge variant={activeStorage === "digitalocean" ? "default" : "secondary"} className="text-xs">
              {activeStorage === "digitalocean" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Armazenamento DigitalOcean Spaces</Label>
              <p className="text-xs text-muted-foreground">Habilite o Armazenamento DigitalOcean para salvar seus arquivos no DigitalOcean Spaces.</p>
            </div>
            <Switch checked={activeStorage === "digitalocean"} onCheckedChange={(c) => setStorageProvider(c ? "digitalocean" : "local")} />
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nome do Space (Space Name)</Label>
              <Input value={doSpace} onChange={(e) => setDoSpace(e.target.value)} placeholder="Nome do seu Bucket DigitalOcean Space" disabled={activeStorage !== "digitalocean"} />
            </div>
            <div className="space-y-2">
              <Label>Chave (Key)</Label>
              <Input value={doKey} onChange={(e) => setDoKey(e.target.value)} placeholder="Sua chave de credenciais do DigitalOcean Space" disabled={activeStorage !== "digitalocean"} />
            </div>
            <div className="space-y-2">
              <Label>Segredo (Secret)</Label>
              <Input type="password" value={doSecret} onChange={(e) => setDoSecret(e.target.value)} placeholder="Seu segredo de credenciais do DigitalOcean Space" disabled={activeStorage !== "digitalocean"} />
              <p className="text-[11px] text-muted-foreground">A chave secreta não é exibida por motivos de segurança, mas você ainda pode sobrescrever a atual.</p>
            </div>
            <div className="space-y-2">
              <Label>Endpoint Personalizado (Opcional)</Label>
              <Input value={doEndpoint} onChange={(e) => setDoEndpoint(e.target.value)} placeholder="https://customCDNdomain.com" disabled={activeStorage !== "digitalocean"} />
            </div>
            <div className="space-y-2">
              <Label>Região do Bucket</Label>
              <Select value={doRegion} onValueChange={setDoRegion} disabled={activeStorage !== "digitalocean"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DO_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeStorage === "digitalocean" && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => handleTestConnection("DigitalOcean")}>Testar Conexão</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wasabi */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Configuração do Wasabi</CardTitle>
                <CardDescription className="mt-1">Armazene arquivos no armazenamento em nuvem Wasabi</CardDescription>
              </div>
            </div>
            <Badge variant={activeStorage === "wasabi" ? "default" : "secondary"} className="text-xs">
              {activeStorage === "wasabi" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="p-3 rounded-lg bg-secondary/50 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">O Wasabi implementou atualizações para melhorar a segurança desativando o acesso público e alterando configurações relacionadas à acessibilidade de objetos e buckets.</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Armazenamento Wasabi</Label>
              <p className="text-xs text-muted-foreground">Habilite o Armazenamento Wasabi para salvar seus arquivos no Wasabi.</p>
            </div>
            <Switch checked={activeStorage === "wasabi"} onCheckedChange={(c) => setStorageProvider(c ? "wasabi" : "local")} />
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nome do Bucket (Bucket Name)</Label>
              <Input value={wasabiBucket} onChange={(e) => setWasabiBucket(e.target.value)} placeholder="Nome do seu Bucket Wasabi" disabled={activeStorage !== "wasabi"} />
            </div>
            <div className="space-y-2">
              <Label>Chave de Acesso (Access Key)</Label>
              <Input value={wasabiAccessKey} onChange={(e) => setWasabiAccessKey(e.target.value)} placeholder="Sua Chave de Acesso do Wasabi" disabled={activeStorage !== "wasabi"} />
            </div>
            <div className="space-y-2">
              <Label>Chave Secreta (Secret Key)</Label>
              <Input type="password" value={wasabiSecretKey} onChange={(e) => setWasabiSecretKey(e.target.value)} placeholder="Sua Chave Secreta do Wasabi" disabled={activeStorage !== "wasabi"} />
            </div>
            <div className="space-y-2">
              <Label>Endpoint Personalizado (Opcional)</Label>
              <Input value={wasabiEndpoint} onChange={(e) => setWasabiEndpoint(e.target.value)} placeholder="https://customCDNdomain.com" disabled={activeStorage !== "wasabi"} />
            </div>
            <div className="space-y-2">
              <Label>Região do Bucket</Label>
              <Select value={wasabiRegion} onValueChange={setWasabiRegion} disabled={activeStorage !== "wasabi"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WASABI_REGIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {activeStorage === "wasabi" && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => handleTestConnection("Wasabi")}>Testar Conexão</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FTP */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Configurações de FTP</CardTitle>
                <CardDescription className="mt-1">Envie arquivos para o seu próprio servidor FTP</CardDescription>
              </div>
            </div>
            <Badge variant={activeStorage === "ftp" ? "default" : "secondary"} className="text-xs">
              {activeStorage === "ftp" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="p-3 rounded-lg bg-secondary/50 flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground"><strong>Importante:</strong> Isso pode reduzir a velocidade de envio/exclusão do seu site. Certifique-se de usar um servidor FTP rápido.</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Armazenamento FTP</Label>
              <p className="text-xs text-muted-foreground">Habilite o Armazenamento FTP para salvar seus arquivos em seu próprio servidor FTP.</p>
            </div>
            <Switch checked={activeStorage === "ftp"} onCheckedChange={(c) => setStorageProvider(c ? "ftp" : "local")} />
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hostname FTP</Label>
                <Input value={ftpHost} onChange={(e) => setFtpHost(e.target.value)} placeholder="IP ou nome de domínio" disabled={activeStorage !== "ftp"} />
              </div>
              <div className="space-y-2">
                <Label>Porta FTP</Label>
                <Input value={ftpPort} onChange={(e) => setFtpPort(e.target.value)} placeholder="21" disabled={activeStorage !== "ftp"} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usuário FTP</Label>
                <Input value={ftpUsername} onChange={(e) => setFtpUsername(e.target.value)} placeholder="Seu usuário FTP" disabled={activeStorage !== "ftp"} />
              </div>
              <div className="space-y-2">
                <Label>Senha FTP</Label>
                <Input type="password" value={ftpPassword} onChange={(e) => setFtpPassword(e.target.value)} placeholder="Sua senha FTP" disabled={activeStorage !== "ftp"} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Caminho FTP</Label>
              <Input value={ftpPath} onChange={(e) => setFtpPath(e.target.value)} placeholder="/upload" disabled={activeStorage !== "ftp"} />
              <p className="text-[11px] text-muted-foreground">O caminho para enviar os arquivos.</p>
            </div>
            <div className="space-y-2">
              <Label>Endpoint FTP</Label>
              <Input value={ftpEndpointUrl} onChange={(e) => setFtpEndpointUrl(e.target.value)} placeholder="wowonderftpstorage.com" disabled={activeStorage !== "ftp"} />
              <p className="text-[11px] text-muted-foreground">IP ou domínio para onde o servidor FTP está apontado.</p>
            </div>
          </div>

          {activeStorage === "ftp" && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => handleTestConnection("FTP")}>Testar Conexão</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Cloud */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Configurações do Google Cloud</CardTitle>
                <CardDescription className="mt-1">Armazene arquivos no Google Cloud Storage</CardDescription>
              </div>
            </div>
            <Badge variant={activeStorage === "gcloud" ? "default" : "secondary"} className="text-xs">
              {activeStorage === "gcloud" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Armazenamento Google Cloud</Label>
              <p className="text-xs text-muted-foreground">Habilite o Armazenamento Google Cloud para salvar seus arquivos no Google Cloud.</p>
            </div>
            <Switch checked={activeStorage === "gcloud"} onCheckedChange={(c) => setStorageProvider(c ? "gcloud" : "local")} />
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Nome do Bucket (Bucket Name)</Label>
              <Input value={gcloudBucket} onChange={(e) => setGcloudBucket(e.target.value)} placeholder="Nome do seu Bucket Google Cloud" disabled={activeStorage !== "gcloud"} />
            </div>
            <div className="space-y-2">
              <Label>Caminho do Arquivo Google Cloud</Label>
              <Input value={gcloudFilePath} onChange={(e) => setGcloudFilePath(e.target.value)} placeholder="Caminho para o seu arquivo JSON do Google Cloud" disabled={activeStorage !== "gcloud"} />
              <p className="text-[11px] text-muted-foreground">Deve ser um arquivo JSON. Certifique-se de manter o arquivo em seu servidor.</p>
            </div>
            <div className="space-y-2">
              <Label>Endpoint Personalizado (Opcional)</Label>
              <Input value={gcloudEndpoint} onChange={(e) => setGcloudEndpoint(e.target.value)} placeholder="https://customCDNdomain.com" disabled={activeStorage !== "gcloud"} />
            </div>
          </div>

          {activeStorage === "gcloud" && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => handleTestConnection("Google Cloud")}>Testar Conexão</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backblaze */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base">Configuração do Backblaze</CardTitle>
                <CardDescription className="mt-1">Armazene arquivos no Backblaze B2</CardDescription>
              </div>
            </div>
            <Badge variant={activeStorage === "backblaze" ? "default" : "secondary"} className="text-xs">
              {activeStorage === "backblaze" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Armazenamento Backblaze</Label>
              <p className="text-xs text-muted-foreground">Habilite o Armazenamento Backblaze para salvar seus arquivos no Backblaze.</p>
            </div>
            <Switch checked={activeStorage === "backblaze"} onCheckedChange={(c) => setStorageProvider(c ? "backblaze" : "local")} />
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID do Bucket (Bucket ID)</Label>
                <Input value={bbBucketId} onChange={(e) => setBbBucketId(e.target.value)} placeholder="ID do seu Bucket Backblaze" disabled={activeStorage !== "backblaze"} />
              </div>
              <div className="space-y-2">
                <Label>Nome do Bucket (Bucket Name)</Label>
                <Input value={bbBucketName} onChange={(e) => setBbBucketName(e.target.value)} placeholder="Nome do seu Bucket Backblaze" disabled={activeStorage !== "backblaze"} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Região do Bucket</Label>
              <Input value={bbRegion} onChange={(e) => setBbRegion(e.target.value)} placeholder="Região do seu Bucket Backblaze" disabled={activeStorage !== "backblaze"} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ID da Chave de Acesso (Access Key ID)</Label>
                <Input value={bbAccessKeyId} onChange={(e) => setBbAccessKeyId(e.target.value)} placeholder="ID da sua Chave de Acesso Backblaze" disabled={activeStorage !== "backblaze"} />
              </div>
              <div className="space-y-2">
                <Label>Chave de Acesso (Access Key)</Label>
                <Input type="password" value={bbAccessKey} onChange={(e) => setBbAccessKey(e.target.value)} placeholder="Sua Chave de Acesso Backblaze" disabled={activeStorage !== "backblaze"} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endpoint Personalizado (Opcional)</Label>
              <Input value={bbEndpoint} onChange={(e) => setBbEndpoint(e.target.value)} placeholder="https://customCDNdomain.com" disabled={activeStorage !== "backblaze"} />
            </div>
          </div>

          {activeStorage === "backblaze" && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => handleTestConnection("Backblaze")}>Testar Conexão</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
};

export default AdminFileUploadSettings;
