import { useState, useRef, useEffect } from "react";
import { Mic, Square, X, Send } from "lucide-react";

interface VoiceRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

const VoiceRecorder = ({ onRecordingComplete, disabled }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        onRecordingComplete(file);
        cleanup();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      // Permission denied or no mic
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    cleanup();
  };

  const cleanup = () => {
    setIsRecording(false);
    setDuration(0);
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (isRecording) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <button
          onClick={cancelRecording}
          className="w-10 h-10 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
          title="Cancelar"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-full bg-secondary">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm font-medium text-foreground">{formatDuration(duration)}</span>
          <div className="flex-1 flex items-center gap-0.5">
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-muted-foreground/40"
                style={{
                  height: `${Math.random() * 16 + 6}px`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        </div>
        <button
          onClick={stopRecording}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90"
          title="Enviar mensagem de voz"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40"
      title="Gravar mensagem de voz"
    >
      <Mic className="w-5 h-5" />
    </button>
  );
};

export default VoiceRecorder;
