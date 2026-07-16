import { useState, useRef, useCallback, useEffect } from "react";
import { X, Upload, Loader2, Film, Video, Square, SwitchCamera, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ReelUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = "choose" | "record" | "preview";

const ReelUploadModal = ({ onClose, onSuccess }: ReelUploadModalProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<Mode>("choose");
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (facing: "user" | "environment" = facingMode) => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
        cameraRef.current.play();
      }
    } catch {
      toast.error("Não foi possível acessar a câmera. Por favor, permita o acesso.");
      setMode("choose");
    }
  }, [facingMode, stopCamera]);

  const enterRecordMode = useCallback(async () => {
    setMode("record");
    await startCamera();
  }, [startCamera]);

  const toggleCamera = useCallback(async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    await startCamera(next);
  }, [facingMode, startCamera]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "video/mp4";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes("webm") ? "webm" : "mp4";
      const recordedFile = new File([blob], `reel-recording.${ext}`, { type: mimeType });
      setFile(recordedFile);
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
      setMode("preview");
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100);
    setRecording(true);
    setRecordingTime(0);

    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= 59) {
          stopRecording();
          return 60;
        }
        return prev + 1;
      });
    }, 1000);
  }, [stopCamera]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const discardRecording = useCallback(() => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRecordingTime(0);
    setMode("choose");
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("video/")) {
      toast.error("Por favor, selecione um arquivo de vídeo");
      return;
    }
    if (selected.size > 100 * 1024 * 1024) {
      toast.error("O vídeo deve ter menos de 100MB");
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(selected);
    video.onloadedmetadata = () => {
      if (video.duration > 60) {
        toast.error("O vídeo deve ter 60 segundos ou menos");
        URL.revokeObjectURL(video.src);
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setMode("preview");
    };
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "webm";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("reel-videos")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("reel-videos").getPublicUrl(path);

      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      const duration = await new Promise<number>((resolve) => {
        video.onloadedmetadata = () => resolve(Math.round(video.duration));
      });

      const { error: insertError } = await supabase.from("reels").insert({
        user_id: user.id,
        video_url: urlData.publicUrl,
        caption: caption.trim(),
        duration,
      });
      if (insertError) throw insertError;

      toast.success("Reel publicado!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Falha ao publicar reel");
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Criar Reel</h2>
          <button
            onClick={() => {
              stopCamera();
              if (recording) stopRecording();
              onClose();
            }}
            className="p-1 rounded-full hover:bg-muted transition"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Choose mode */}
          {mode === "choose" && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Film className="w-7 h-7 text-primary" />
                </div>
                <p className="text-foreground font-medium">Carregar um vídeo</p>
                <p className="text-xs text-muted-foreground text-center">
                  MP4, MOV ou WebM • Máx 60s • Máx 100MB
                </p>
              </div>

              <div
                onClick={enterRecordMode}
                className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-destructive/50 hover:bg-destructive/5 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Video className="w-7 h-7 text-destructive" />
                </div>
                <p className="text-foreground font-medium">Gravar com a câmera</p>
                <p className="text-xs text-muted-foreground text-center">
                  Use a câmera do seu dispositivo • Máx 60 segundos
                </p>
              </div>
            </div>
          )}

          {/* Camera recording mode */}
          {mode === "record" && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[400px] mx-auto">
                <video
                  ref={cameraRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
                />

                {/* Recording timer */}
                {recording && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                    <span className="text-white text-sm font-mono font-medium">
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                )}

                {/* Flip camera button */}
                {!recording && (
                  <button
                    onClick={toggleCamera}
                    className="absolute top-3 right-3 p-2 bg-black/50 rounded-full hover:bg-black/70 transition"
                  >
                    <SwitchCamera className="w-5 h-5 text-white" />
                  </button>
                )}

                {/* Back button */}
                {!recording && (
                  <button
                    onClick={() => { stopCamera(); setMode("choose"); }}
                    className="absolute top-3 left-3 p-2 bg-black/50 rounded-full hover:bg-black/70 transition"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>

              {/* Record / Stop button */}
              <div className="flex justify-center">
                {!recording ? (
                  <button
                    onClick={startRecording}
                    className="w-16 h-16 rounded-full border-4 border-destructive flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <div className="w-10 h-10 rounded-full bg-destructive" />
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="w-16 h-16 rounded-full border-4 border-destructive flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <Square className="w-6 h-6 text-destructive fill-destructive" />
                  </button>
                )}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                {recording ? "Toque no quadrado para parar" : "Toque para iniciar a gravação"}
              </p>
            </div>
          )}

          {/* Preview mode */}
          {mode === "preview" && previewUrl && (
            <>
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[400px] mx-auto">
                <video
                  ref={videoPreviewRef}
                  src={previewUrl}
                  className="w-full h-full object-cover"
                  controls
                  muted
                />
                <button
                  onClick={discardRecording}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full hover:bg-black/70"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Caption + actions (only in preview mode) */}
          {mode === "preview" && (
            <>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Escreva uma legenda..."
                className="w-full bg-muted rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={3}
                maxLength={500}
              />

              <div className="flex gap-2">
                <button
                  onClick={discardRecording}
                  className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition"
                >
                  Descartar
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90 transition"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Publicar Reel
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Cancel in choose mode */}
          {mode === "choose" && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReelUploadModal;
