import React from "react";

/**
 * Renders text content with clickable hashtags.
 * Hashtags link to a search or filter (currently uses the global search with the tag).
 */
export const renderLinkedContent = (text: string): React.ReactNode => {
  // Match #hashtag (letters, numbers, underscores, no leading digit)
  const hashtagRegex = /(#[a-zA-Z_]\w*)/g;
  const parts = text.split(hashtagRegex);

  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (hashtagRegex.test(part)) {
      // Reset regex lastIndex
      hashtagRegex.lastIndex = 0;
      return (
        <a
          key={i}
          href={`/hashtag/${encodeURIComponent(part.slice(1))}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="text-primary hover:underline font-medium cursor-pointer"
        >
          {part}
        </a>
      );
    }
    // Reset regex lastIndex
    hashtagRegex.lastIndex = 0;
    return part;
  });
};
