/**
 * Parses a user-pasted YouTube or Instagram link into a safe, canonical embed
 * URL. The embed host is ALWAYS one we hard-code here (youtube-nocookie.com /
 * instagram.com) — never taken raw from the input — so the value is safe to put
 * in an <iframe src> under our CSP frame-src allowlist. Returns null for any
 * unsupported/unparseable link, so callers can reject it with a clear message.
 */
export type VideoProvider = "YOUTUBE" | "INSTAGRAM";

export type ParsedVideo = {
  provider: VideoProvider;
  sourceUrl: string;
  embedUrl: string;
};

const YT_ID = /^[A-Za-z0-9_-]{6,20}$/;
const IG_CODE = /^[A-Za-z0-9_-]{5,24}$/;

function youtube(id: string | null | undefined, sourceUrl: string): ParsedVideo | null {
  if (!id || !YT_ID.test(id)) return null;
  return {
    provider: "YOUTUBE",
    sourceUrl,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`
  };
}

export function parseVideoUrl(raw: string): ParsedVideo | null {
  const trimmed = (raw ?? "").trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  // ── YouTube (incl. Shorts) ──────────────────────────────────────────────
  if (host === "youtu.be") {
    return youtube(parts[0], trimmed);
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") return youtube(url.searchParams.get("v"), trimmed);
    if (["shorts", "embed", "live", "v"].includes(parts[0])) return youtube(parts[1], trimmed);
    return null;
  }

  // ── Instagram (reels & posts) ───────────────────────────────────────────
  if (host === "instagram.com") {
    const type = parts[0];
    const code = parts[1];
    if (["reel", "reels", "p", "tv"].includes(type) && code && IG_CODE.test(code)) {
      // Instagram serves a self-contained embed at /<type>/<code>/embed.
      const path = type === "reels" ? "reel" : type;
      return {
        provider: "INSTAGRAM",
        sourceUrl: trimmed,
        embedUrl: `https://www.instagram.com/${path}/${code}/embed`
      };
    }
    return null;
  }

  return null;
}
