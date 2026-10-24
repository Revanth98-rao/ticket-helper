import DOMPurify from "dompurify";

/**
 * Ensure DOMPurify hook adds target="_blank" and rel="noopener noreferrer"
 * to all sanitized anchor links to prevent tabnabbing.
 */
if (typeof window !== "undefined") {
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && "target" in node) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

/**
 * Sanitizes untrusted HTML using DOMPurify to prevent XSS attacks while
 * preserving safe formatting markup (paragraphs, bold, links, lists, etc.).
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return "";
  return DOMPurify.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
}

