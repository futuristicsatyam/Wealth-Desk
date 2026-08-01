import { Reveal } from "@/components/motion/reveal";
import { VideoReels } from "@/components/marketing/video-reels";

type VideoReel = {
  id: string;
  authorName: string;
  authorRole: string | null;
  provider: "YOUTUBE" | "INSTAGRAM";
  embedUrl: string;
};

/**
 * Video-reel service-feedback section for the home page. Same SEBI framing as
 * the text reviews — experience of the research service, no returns claims.
 * Renders nothing when there are no published reels.
 */
export function VideoTestimonials({ reels }: { reels: VideoReel[] }) {
  if (reels.length === 0) return null;

  return (
    <section className="border-y border-border bg-surface">
      <div className="container-page py-20 md:py-28">
        <Reveal className="mx-auto max-w-2xl text-center sm:mx-0 sm:text-left">
          <p className="text-xs uppercase tracking-[0.22em] text-accent">Video stories</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
            Members, in their own words
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
            Short reels on how the research desk fits into members&apos; process — swipe through.
          </p>
        </Reveal>

        <VideoReels reels={reels} />
      </div>
    </section>
  );
}
