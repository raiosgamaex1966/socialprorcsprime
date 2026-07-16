import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, MessageCircle } from "lucide-react";
import LightboxSocialPanel from "@/components/LightboxSocialPanel";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  postId?: string;
  postType?: "post" | "group_post";
  authorName?: string;
  authorAvatar?: string | null;
  authorId?: string;
  createdAt?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.25;
const DRAG_THRESHOLD = 5;

const ImageLightbox = ({
  images,
  initialIndex = 0,
  open,
  onClose,
  postId,
  postType,
  authorName,
  authorAvatar,
  authorId,
  createdAt,
}: ImageLightboxProps) => {
  const [current, setCurrent] = useState(initialIndex);
  const [scale, setScale] = useState(MIN_SCALE);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const didDrag = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<number | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const hasSocialPanel = !!(postId && postType && authorName && createdAt);
  const zoomed = scale > MIN_SCALE;

  useEffect(() => {
    if (open) {
      setCurrent(initialIndex);
      setScale(MIN_SCALE);
      setPan({ x: 0, y: 0 });
    }
  }, [open, initialIndex]);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    if (open) resetHideTimer();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [open, resetHideTimer]);

  const goNext = useCallback(() => {
    if (current < images.length - 1) {
      setCurrent((p) => p + 1);
      setScale(MIN_SCALE);
      setPan({ x: 0, y: 0 });
    }
  }, [current, images.length]);

  const goPrev = useCallback(() => {
    if (current > 0) {
      setCurrent((p) => p - 1);
      setScale(MIN_SCALE);
      setPan({ x: 0, y: 0 });
    }
  }, [current]);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + ZOOM_STEP, MAX_SCALE));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(prev - ZOOM_STEP, MIN_SCALE);
      if (next === MIN_SCALE) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const resetView = useCallback(() => {
    setScale(MIN_SCALE);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse drag for panning when zoomed
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!zoomed) return;
    e.preventDefault();
    setIsDragging(true);
    didDrag.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [zoomed, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      didDrag.current = true;
    }
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, goNext, goPrev, zoomIn, zoomOut]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex bg-black/95 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onMouseMove={() => resetHideTimer()}
    >
      {/* Image area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Top bar */}
        <div
      className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-20 bg-gradient-to-b from-black/60 to-transparent"
        >
          <div className="flex items-center gap-2">
            {images.length > 1 && (
              <span className="text-white/90 text-xs font-semibold bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                {current + 1} / {images.length}
              </span>
            )}
            {zoomed && (
              <span className="text-white/70 text-xs bg-black/50 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                {Math.round(scale * 100)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {zoomed && (
              <button
                onClick={resetView}
                className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all duration-200 border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95"
                title="Reset zoom"
              >
                <RotateCcw className="w-4 h-4 text-white" />
              </button>
            )}
            <button
              onClick={zoomOut}
              disabled={scale <= MIN_SCALE}
              className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all duration-200 border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
              title="Zoom out (-)"
            >
              <ZoomOut className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={zoomIn}
              disabled={scale >= MAX_SCALE}
              className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all duration-200 border border-white/10 hover:border-white/20 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
              title="Zoom in (+)"
            >
              <ZoomIn className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md hover:bg-red-500/80 flex items-center justify-center transition-all duration-200 border border-white/10 hover:border-red-400/50 hover:scale-105 active:scale-95"
              title="Close (Esc)"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Navigation arrows */}
        {current > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all duration-300 z-10 border border-white/10 hover:border-white/20 hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}
        {current < images.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all duration-300 z-10 border border-white/10 hover:border-white/20 hover:scale-110 active:scale-95"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Image with zoom & pan */}
        <div
          className={`flex-1 flex items-center justify-center p-8 overflow-hidden ${
            zoomed ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget && !zoomed) onClose();
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={images[current]}
            alt={`Image ${current + 1}`}
            onClick={(e) => {
              if (!didDrag.current) {
                e.stopPropagation();
                if (zoomed) {
                  zoomOut();
                } else {
                  zoomIn();
                }
              }
            }}
            className="select-none rounded-lg transition-transform duration-300 ease-out"
            style={{
              transform: `scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
              maxWidth: zoomed ? "none" : "100%",
              maxHeight: zoomed ? "none" : "100%",
              objectFit: "contain",
            }}
            draggable={false}
          />
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/40 backdrop-blur-md px-3 py-2 rounded-full border border-white/10"
          >
            {images.length <= 8 ? (
              images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => { setCurrent(idx); setScale(MIN_SCALE); setPan({ x: 0, y: 0 }); }}
                  className={`w-8 h-8 rounded-md overflow-hidden border-2 transition-all duration-200 hover:scale-110 ${
                    idx === current
                      ? "border-white shadow-lg shadow-white/20"
                      : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))
            ) : (
              images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => { setCurrent(idx); setScale(MIN_SCALE); setPan({ x: 0, y: 0 }); }}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    idx === current ? "bg-white scale-125" : "bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Social side panel — desktop only */}
      {hasSocialPanel && (
        <div className="hidden xl:flex">
          <LightboxSocialPanel
            postId={postId!}
            postType={postType!}
            authorName={authorName!}
            authorAvatar={authorAvatar}
            authorId={authorId}
            createdAt={createdAt!}
            currentImageUrl={images[current]}
          />
        </div>
      )}

      {/* Floating chat button — tablet/mobile */}
      {hasSocialPanel && !mobilePanelOpen && (
        <button
          onClick={(e) => { e.stopPropagation(); setMobilePanelOpen(true); }}
          className="xl:hidden fixed bottom-6 right-6 z-[110] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
          title="Comments & Reactions"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Mobile/tablet social panel sheet */}
      {hasSocialPanel && (
        <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
          <SheetContent side="right" className="xl:hidden w-[380px] sm:max-w-[380px] p-0 z-[110] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <SheetTitle className="sr-only">Comments & Reactions</SheetTitle>
            <LightboxSocialPanel
              postId={postId!}
              postType={postType!}
              authorName={authorName!}
              authorAvatar={authorAvatar}
              authorId={authorId}
              createdAt={createdAt!}
              currentImageUrl={images[current]}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>,
    document.body
  );
};

export default ImageLightbox;
