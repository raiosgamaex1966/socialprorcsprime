import DOMPurify from "dompurify";

/**
 * Sanitize HTML coming from the database / user input before rendering it
 * with `dangerouslySetInnerHTML`. Strips <script>, inline event handlers,
 * `javascript:` URLs and other XSS vectors while keeping the rich-text and
 * basic HTML formatting an admin would reasonably author.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onsubmit"],
  });
}

/**
 * Stricter sanitizer for ad markup / CMS where we still want links and images
 * but absolutely no script execution. Allows a safe subset of HTML.
 */
export function sanitizeAdHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "a", "img", "p", "div", "span", "br", "hr", "strong", "em", "b", "i", "u",
      "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "td", "th", "section", "article", "figure", "figcaption",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "class", "style", "width", "height"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}
