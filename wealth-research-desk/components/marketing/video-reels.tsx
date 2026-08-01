import { Play } from "lucide-react";

type VideoReel = {
  id: string;
  authorName: string;
  authorRole: string | null;
  provider: "YOUTUBE" | "INSTAGRAM";
  embedUrl: string;
};

/**
 * Horizontally scrollable strip of vertical (9:16) reel cards. Each reel is a
 * sandboxed <iframe> to YouTube/Instagram — allowed via the CSP frame-src
 * allowlist. Same scroll behaviour as the text-review carousel.
 */
export function VideoReels({ reels }: { reels: VideoReel[] }) {
  return (
    <div className="relative mt-14">
      <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {reels.map((reel) => (
          <figure
            key={reel.id}
            className="group flex w-[72%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors duration-200 hover:border-border-strong sm:w-[300px]"
          >
            <div className="relative aspect-[9/16] w-full bg-black">
              <iframe
                src={reel.embedUrl}
                title={`Video reel by ${reel.authorName}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
            <figcaption className="flex items-center gap-2 border-t border-border px-4 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-inset ring-accent/20">
                <Play size={13} className="fill-accent" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{reel.authorName}</span>
                {reel.authorRole && (
                  <span className="block truncate text-xs text-muted">{reel.authorRole}</span>
                )}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
