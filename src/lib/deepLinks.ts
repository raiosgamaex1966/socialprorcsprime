import { toast } from "sonner";

/**
 * Generate shareable URLs for various content types
 */
export const getShareableUrl = (type: string, id: string, slug?: string): string => {
  const base = window.location.origin;
  switch (type) {
    case "post":
      return `${base}/?post=${id}`;
    case "group_post":
      return `${base}/?post=${id}&source=group`;
    case "page_post":
      return `${base}/?post=${id}&source=page`;
    case "event":
      return `${base}/events/${id}`;
    case "listing":
      return `${base}/marketplace/${id}`;
    case "group":
      return `${base}/groups/${id}`;
    case "reel":
      return `${base}/reels?id=${id}`;
    case "page":
      return `${base}/pages/${slug || id}`;
    case "profile":
      return `${base}/profile/${id}`;
    case "conversation":
      return `${base}/messages?conversation=${id}`;
    default:
      return `${base}`;
  }
};

/**
 * Get the deep-link path for creating content of a given type
 */
export const getCreateUrl = (type: string): string => {
  switch (type) {
    case "post":
      return "/?create=post";
    case "story":
      return "/?create=story";
    case "reel":
      return "/reels?create=true";
    case "group":
      return "/groups?create=true";
    case "page":
      return "/pages?create=true";
    case "event":
      return "/events?create=true";
    case "product":
      return "/marketplace?create=true";
    case "ad":
      return "/advertising?create=true";
    default:
      return "/";
  }
};

/**
 * Copy a shareable link to clipboard with toast feedback
 */
export const copyShareableLink = async (type: string, id: string, slug?: string): Promise<void> => {
  const url = getShareableUrl(type, id, slug);
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    toast.success("Link copied to clipboard!");
  }
};

/**
 * Resolve a notification to its deep link path
 */
export const getNotificationDeepLink = (notification: {
  type: string;
  reference_id?: string | null;
  actor_id?: string;
  message?: string;
}): string => {
  const { type, reference_id, actor_id } = notification;

  switch (type) {
    case "like":
    case "comment":
      return reference_id ? `/?post=${reference_id}` : "/";

    case "group_post_like":
    case "group_post_comment":
      return reference_id ? `/?post=${reference_id}&source=group` : "/";

    case "page_follow":
    case "page_post_like":
    case "page_post_comment":
      // reference_id is the page_post_id or page_id
      return reference_id ? `/?post=${reference_id}&source=page` : "/pages";

    case "friend_request":
      return "/friends?tab=requests";

    case "memory":
      return "/memories";

    case "event":
      return reference_id ? `/events/${reference_id}` : "/events";

    case "event_digest":
      return "/events";

    case "review":
    case "price_drop":
    case "offer":
    case "offer_accepted":
    case "offer_rejected":
      return reference_id ? `/marketplace/${reference_id}` : "/marketplace";

    case "credit_gift":
    case "admin_credit_gift":
    case "credit_spent":
      return "/credits";

    default:
      return actor_id ? `/profile/${actor_id}` : "/";
  }
};
