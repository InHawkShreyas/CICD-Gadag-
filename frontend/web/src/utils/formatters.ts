/**
 * Shared formatting helpers for the student & admin support pages.
 *
 * The backend sends timestamps like "2026-07-27T10:25:14.092243" — no
 * "Z"/offset suffix. Without one, `new Date(...)` parses it as LOCAL time
 * instead of UTC, so times were showing ~5:30 hrs behind for IST users.
 * These timestamps are actually UTC, so append "Z" (when no timezone info
 * is already present) before parsing.
 */
export const parseServerDate = (iso: string): Date => {
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(iso);
  return new Date(hasTimezone ? iso : `${iso}Z`);
};

/** e.g. "14:32" for today, or "27 Jul, 14:32" for earlier days — used on chat bubbles and list rows. */
export const formatBubbleTime = (iso?: string): string => {
  if (!iso) return "";
  const d = parseServerDate(iso);
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const isToday = new Date().toDateString() === d.toDateString();
  return isToday ? time : `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}, ${time}`;
};

/** e.g. "27 Jul 2026" — used in the admin ticket-details pane. */
export const formatDate = (iso?: string): string =>
  iso ? parseServerDate(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/** Subtle chat-wallpaper dot texture behind message bubbles, on the light brand-tinted background. */
export const chatWallpaperStyle = {
  backgroundImage: "radial-gradient(circle, rgba(78,108,80,0.07) 1px, transparent 1px)",
  backgroundSize: "16px 16px",
} as const;
