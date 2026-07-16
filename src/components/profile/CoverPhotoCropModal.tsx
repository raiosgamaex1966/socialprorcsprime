import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { X, Check, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoverPhotoCropModalProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas is empty"));
    }, "image/jpeg", 0.92);
  });
}

const CoverPhotoCropModal = ({ imageSrc, onCropComplete, onCancel }: CoverPhotoCropModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropDone = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(blob);
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col">
      {/* Top Header Label (No action buttons here) */}
      <div className="flex items-center justify-center px-4 py-3 bg-black/60 backdrop-blur-sm z-10">
        <h3 className="text-white font-semibold text-sm">Recortar Foto de Capa</h3>
      </div>

      {/* Crop area */}
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={16 / 5}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropDone}
          showGrid
          style={{
            containerStyle: { background: "#000" },
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4 py-3 bg-black/80 backdrop-blur-sm border-t border-white/10 z-10">
        <div className="flex items-center gap-3">
          <ZoomOut className="w-4 h-4 text-white/60" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-32 sm:w-48 accent-primary"
          />
          <ZoomIn className="w-4 h-4 text-white/60" />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs px-3 py-1.5 h-8 rounded-lg border border-white/20 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Rotacionar
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="text-white bg-transparent border-white/20 hover:bg-white/10 hover:text-white text-xs px-3 py-1.5 h-8"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Cancelar
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-3 py-1.5 h-8"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CoverPhotoCropModal;
