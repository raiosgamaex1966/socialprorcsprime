import { useRef } from "react";
import { Paperclip, X, FileText, File } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
];

interface PendingAttachment {
  file: File;
  preview: string | null;
  type: "image" | "file";
}

interface ChatAttachmentButtonProps {
  onAttachmentReady: (attachment: { url: string; type: string; name: string }) => void;
  pending: PendingAttachment | null;
  setPending: (p: PendingAttachment | null) => void;
  uploading: boolean;
  setUploading: (u: boolean) => void;
}

export const ChatAttachmentButton = ({
  pending,
  setPending,
  uploading,
}: ChatAttachmentButtonProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. O tamanho máximo é de 10MB.");
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado.");
      return;
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const preview = isImage ? URL.createObjectURL(file) : null;

    setPending({ file, preview, type: isImage ? "image" : "file" });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_FILE_TYPES.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-40"
        title="Anexar arquivo"
      >
        <Paperclip className="w-5 h-5" />
      </button>
    </>
  );
};

export const AttachmentPreview = ({
  pending,
  onRemove,
}: {
  pending: PendingAttachment;
  onRemove: () => void;
}) => {
  return (
    <div className="px-4 pb-2">
      <div className="inline-flex items-center gap-2 bg-secondary rounded-lg p-2 pr-3 max-w-xs">
        {pending.preview ? (
          <img
            src={pending.preview}
            alt="Pré-visualização"
            className="w-12 h-12 rounded object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate">{pending.file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(pending.file.size / 1024).toFixed(0)} KB
          </p>
        </div>
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/20 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export const MessageAttachment = ({
  url,
  type,
  name,
}: {
  url: string;
  type: string;
  name: string;
}) => {
  if (type === "audio") {
    return (
      <div className="mt-1 min-w-[200px]">
        <audio controls preload="metadata" className="w-full max-w-[260px] h-9">
          <source src={url} />
        </audio>
      </div>
    );
  }

  if (type === "image") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1">
        <img
          src={url}
          alt={name}
          className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-1 p-2 rounded-lg bg-background/20 hover:bg-background/30 transition-colors"
    >
      <File className="w-5 h-5 shrink-0" />
      <span className="text-sm truncate underline">{name}</span>
    </a>
  );
};

export type { PendingAttachment };
