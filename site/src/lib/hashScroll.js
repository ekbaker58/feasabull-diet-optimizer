/**
 * Re-apply the URL's hash scroll.
 *
 * The browser scrolls to #how (or #nutrients) the moment you navigate, but the
 * Calculator restores your saved report a tick later and grows by several
 * hundred pixels. Anything below it moves down, so the first scroll lands
 * short -- and #nutrients lives inside the report, so before it renders there
 * is no element to scroll to at all. Calling this once the report is on screen
 * puts you where you asked to be.
 */
export function scrollToHash() {
  if (typeof window === "undefined") return;
  const id = decodeURIComponent(window.location.hash.replace("#", ""));
  if (!id) return;
  const target = document.getElementById(id);
  // "auto", not "smooth": this is a correction, not a journey.
  if (target) target.scrollIntoView({ block: "start", behavior: "auto" });
}
