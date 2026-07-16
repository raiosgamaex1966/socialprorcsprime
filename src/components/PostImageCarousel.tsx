import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ImageLightbox from "@/components/ImageLightbox";

interface PostImageCarouselProps {
  images: string[];
  postId?: string;
  postType?: "post" | "group_post";
  authorName?: string;
  authorAvatar?: string | null;
  authorId?: string;
  createdAt?: string;
}

const PostImageCarousel = ({ images, postId, postType, authorName, authorAvatar, authorId, createdAt }: PostImageCarouselProps) => {
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (images.length === 0) return null;

  const openLightbox = (idx: number) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  const socialProps = postId && postType && authorName && createdAt
    ? { postId, postType, authorName, authorAvatar, authorId, createdAt }
    : {};

  if (images.length === 1) {
    return (
      <>
        <div className="w-full cursor-pointer" onClick={() => openLightbox(0)}>
          <img src={images[0]} alt="Post" className="w-full object-cover max-h-[500px]" loading="lazy" />
        </div>
        <ImageLightbox images={images} initialIndex={0} open={lightboxOpen} onClose={() => setLightboxOpen(false)} {...socialProps} />
      </>
    );
  }

  return (
    <>
      <div className="relative w-full group">
        <img
          src={images[current]}
          alt={`Post image ${current + 1}`}
          className="w-full object-cover max-h-[500px] cursor-pointer"
          loading="lazy"
          onClick={() => openLightbox(current)}
        />

        {/* Counter badge */}
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full">
          {current + 1} / {images.length}
        </div>

        {/* Previous button */}
        {current > 0 && (
          <button
            onClick={() => setCurrent((p) => p - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/80 hover:bg-card flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
        )}

        {/* Next button */}
        {current < images.length - 1 && (
          <button
            onClick={() => setCurrent((p) => p + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/80 hover:bg-card flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        )}

        {/* Dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === current ? "bg-primary" : "bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>

      <ImageLightbox images={images} initialIndex={lightboxIndex} open={lightboxOpen} onClose={() => setLightboxOpen(false)} {...socialProps} />
    </>
  );
};

export default PostImageCarousel;
